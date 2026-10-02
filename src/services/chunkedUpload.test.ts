import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    CONNECTION_LOST_MESSAGE,
    MIN_CHUNK_SIZE,
    RETRY_DELAYS_MS,
    UPLOAD_CANCELLED_MESSAGE,
    classifyFailure,
    computeProgress,
    createAbortError,
    getChunkEnd,
    getRetryDelay,
    isAbortError,
    listChunkRanges,
    readReceived,
    reduceChunkSize,
    uploadFileInChunks
} from './chunkedUpload';
import type { ChunkedUploadConfig } from './chunkedUpload';

const MB = 1024 * 1024;

describe('chunk boundaries', () => {
    it('uses a single chunk for a file smaller than the chunk size', () => {
        expect(listChunkRanges(1, 4 * MB)).toEqual([{ start: 0, end: 1 }]);
        expect(listChunkRanges(3 * MB, 4 * MB)).toEqual([{ start: 0, end: 3 * MB }]);
    });

    it('splits an exact multiple into full chunks only', () => {
        expect(listChunkRanges(8 * MB, 4 * MB)).toEqual([
            { start: 0, end: 4 * MB },
            { start: 4 * MB, end: 8 * MB }
        ]);
        expect(listChunkRanges(4 * MB, 4 * MB)).toEqual([{ start: 0, end: 4 * MB }]);
    });

    it('ends with a partial chunk', () => {
        const size = 13 * MB + 5;
        const ranges = listChunkRanges(size, 4 * MB);
        expect(ranges).toHaveLength(4);
        expect(ranges[3]).toEqual({ start: 12 * MB, end: size });
        expect(ranges.reduce((total, { start, end }) => total + end - start, 0)).toBe(size);
    });

    it('never goes past the end of the file', () => {
        expect(getChunkEnd(12 * MB, 4 * MB, 13 * MB)).toBe(13 * MB);
        expect(listChunkRanges(0, 4 * MB)).toEqual([]);
    });
});

describe('computeProgress', () => {
    it('adds the bytes of the current chunk to the confirmed ones', () => {
        expect(computeProgress(0, 0, 100)).toBe(0);
        expect(computeProgress(40, 10, 100)).toBe(50);
        expect(computeProgress(4 * MB, 2 * MB, 12 * MB)).toBe(50);
        expect(computeProgress(100, 0, 100)).toBe(100);
    });

    it('stays within 0..100 and handles empty files', () => {
        expect(computeProgress(100, 50, 100)).toBe(100);
        expect(computeProgress(0, 0, 0)).toBe(0);
    });
});

describe('retry decisions', () => {
    it('retries network errors, timeouts, 408, 429 and 5xx', () => {
        for (const status of [0, 408, 429, 500, 502, 503, 504]) {
            expect(classifyFailure(status)).toBe('retry');
        }
    });

    it('resyncs on 409 and fails on other client errors', () => {
        expect(classifyFailure(409)).toBe('resync');
        for (const status of [400, 401, 403, 404, 413]) {
            expect(classifyFailure(status)).toBe('fail');
        }
    });

    it('backs off 1s, 3s and 6s and then gives up', () => {
        expect(RETRY_DELAYS_MS.map((_, attempt) => getRetryDelay(attempt))).toEqual([1000, 3000, 6000]);
        expect(getRetryDelay(3)).toBeNull();
        expect(getRetryDelay(-1)).toBeNull();
    });

    it('halves the chunk size down to the minimum', () => {
        expect(reduceChunkSize(4 * MB)).toBe(2 * MB);
        expect(reduceChunkSize(2 * MB)).toBe(MIN_CHUNK_SIZE);
        expect(reduceChunkSize(MIN_CHUNK_SIZE)).toBe(MIN_CHUNK_SIZE);
        expect(reduceChunkSize(1000)).toBe(1000);
    });

    it('accepts only a valid received count from the server', () => {
        expect(readReceived({ received: 5 }, 10)).toBe(5);
        expect(readReceived({ received: 0 }, 10)).toBe(0);
        expect(readReceived({ received: 11 }, 10)).toBeNull();
        expect(readReceived({ received: '5' }, 10)).toBeNull();
        expect(readReceived({}, 10)).toBeNull();
    });
});

describe('abort errors', () => {
    it('are recognised by isAbortError and carry the cancel message', () => {
        const err = createAbortError();
        expect(isAbortError(err)).toBe(true);
        expect(err.message).toBe(UPLOAD_CANCELLED_MESSAGE);
        expect(isAbortError(new Error('x'))).toBe(false);
    });
});

// ============== Engine with a scripted fake XMLHttpRequest ==============

interface SentRequest {
    method: string;
    url: string;
    size: number;
}
type Reply = { status: number; body?: unknown };
type Handler = (request: SentRequest) => Reply | 'hang';

let handler: Handler;
let sent: SentRequest[];
let fetchMock: ReturnType<typeof vi.fn>;

class FakeXhr {
    status = 0;
    responseText = '';
    timeout = 0;
    upload: { onprogress: ((event: { loaded: number }) => void) | null } = { onprogress: null };
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    ontimeout: (() => void) | null = null;
    onabort: (() => void) | null = null;
    private method = '';
    private url = '';

    open(method: string, url: string) {
        this.method = method;
        this.url = url;
    }

    setRequestHeader() {}

    abort() {
        queueMicrotask(() => this.onabort?.());
    }

    send(body: Blob | string | null) {
        const size = body instanceof Blob ? body.size : (body ?? '').length;
        const request = { method: this.method, url: this.url, size };
        sent.push(request);
        const reply = handler(request);
        if (reply === 'hang') return;
        queueMicrotask(() => {
            this.upload.onprogress?.({ loaded: size });
            if (reply.status === 0) {
                this.onerror?.();
                return;
            }
            this.status = reply.status;
            this.responseText = JSON.stringify(reply.body ?? {});
            this.onload?.();
        });
    }
}

const config = (onUnauthorized = vi.fn()): ChunkedUploadConfig => ({ baseUrl: 'http://api', getToken: () => 't', onUnauthorized });
const makeFile = (size: number) => new File([new Uint8Array(size)], 'aula.mp4', { type: 'video/mp4' });
const DONE = { message: 'ok', filename: 'video-1.mp4', originalName: 'aula.mp4', size: 0, videoUrl: '/uploads/videos/video-1.mp4' };

// A well-behaved server: 4-byte chunks, stores bytes in order
function serverHandler(fileSize: number, overrides: (request: SentRequest, received: number) => Reply | 'hang' | undefined = () => undefined): Handler {
    let received = 0;
    return (request) => {
        const override = overrides(request, received);
        if (override) return override;
        if (request.url.endsWith('/init')) return { status: 201, body: { uploadId: 'u1', chunkSize: 4 } };
        if (request.url.endsWith('/complete')) return { status: 200, body: { ...DONE, size: fileSize } };
        const offset = Number(new URL(request.url).searchParams.get('offset'));
        if (offset !== received) return { status: 409, body: { error: 'fora de ordem', received } };
        received += request.size;
        return { status: 200, body: { received } };
    };
}

const offsetsOf = (requests: SentRequest[]) => requests
    .filter(r => r.method === 'PUT')
    .map(r => [Number(new URL(r.url).searchParams.get('offset')), r.size]);

describe('uploadFileInChunks', () => {
    beforeEach(() => {
        sent = [];
        vi.useFakeTimers();
        vi.stubGlobal('XMLHttpRequest', FakeXhr);
        fetchMock = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })));
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    async function run(size: number, options: { signal?: AbortSignal; onProgress?: (p: number) => void; onUnauthorized?: () => void } = {}) {
        const promise = uploadFileInChunks(config(options.onUnauthorized as never), {
            kind: 'video', file: makeFile(size), fallbackError: 'Erro ao fazer upload do vídeo', ...options
        });
        const settled = promise.then(value => ({ value }), (error: unknown) => ({ error }));
        await vi.runAllTimersAsync();
        return settled;
    }

    it('sends every chunk in order, completes and reports progress up to 100', async () => {
        handler = serverHandler(10);
        const progress: number[] = [];
        const result = await run(10, { onProgress: p => progress.push(p) });
        expect(result).toEqual({ value: { ...DONE, size: 10 } });
        expect(offsetsOf(sent)).toEqual([[0, 4], [4, 4], [8, 2]]);
        expect(sent[sent.length - 1].url).toBe('http://api/upload/chunked/u1/complete');
        expect(progress[progress.length - 1]).toBe(100);
        expect(progress).toEqual([...progress].sort((a, b) => a - b));
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('retries a chunk after 5xx and network errors', async () => {
        let failures = 0;
        handler = serverHandler(10, (request) => {
            if (request.method !== 'PUT' || failures >= 2) return undefined;
            failures += 1;
            return { status: failures === 1 ? 503 : 0 };
        });
        const result = await run(10);
        expect(result).toEqual({ value: { ...DONE, size: 10 } });
        // 503, then a network error (4-byte chunks are already below the minimum, so they are not halved)
        expect(offsetsOf(sent)).toEqual([[0, 4], [0, 4], [0, 4], [4, 4], [8, 2]]);
    });

    it('waits and resends when the server is still writing the same position (409 without progress)', async () => {
        let busy = true;
        handler = serverHandler(10, (request, received) => {
            if (request.method !== 'PUT' || !busy) return undefined;
            busy = false;
            return { status: 409, body: { error: 'ocupado', received } };
        });
        const result = await run(10);
        expect(result).toEqual({ value: { ...DONE, size: 10 } });
        expect(offsetsOf(sent)).toEqual([[0, 4], [0, 4], [4, 4], [8, 2]]);
    });

    it('halves the chunk after a network error so slow links still fit the timeout', async () => {
        let failed = false;
        const size = 3 * MB;
        handler = (request) => {
            if (request.url.endsWith('/init')) return { status: 201, body: { uploadId: 'u1', chunkSize: 4 * MB } };
            if (request.url.endsWith('/complete')) return { status: 200, body: { ...DONE, size } };
            if (!failed) {
                failed = true;
                return { status: 0 };
            }
            const offset = Number(new URL(request.url).searchParams.get('offset'));
            return { status: 200, body: { received: offset + request.size } };
        };
        const result = await run(size);
        expect(result).toEqual({ value: { ...DONE, size } });
        expect(offsetsOf(sent)).toEqual([[0, 3 * MB], [0, 2 * MB], [2 * MB, MB]]);
    });

    it('jumps ahead when the server already stored more bytes', async () => {
        let jumped = false;
        handler = (request) => {
            if (request.url.endsWith('/init')) return { status: 201, body: { uploadId: 'u1', chunkSize: 4 } };
            if (request.url.endsWith('/complete')) return { status: 200, body: { ...DONE, size: 10 } };
            const offset = Number(new URL(request.url).searchParams.get('offset'));
            if (!jumped) {
                jumped = true;
                return { status: 409, body: { error: 'x', received: 8 } };
            }
            return { status: 200, body: { received: offset + request.size } };
        };
        const result = await run(10);
        expect(result).toEqual({ value: { ...DONE, size: 10 } });
        expect(offsetsOf(sent)).toEqual([[0, 4], [8, 2]]);
    });

    it('retries complete while the server is still writing the last chunk (409)', async () => {
        let busy = true;
        handler = serverHandler(10, (request) => {
            if (!request.url.endsWith('/complete') || !busy) return undefined;
            busy = false;
            return { status: 409, body: { error: 'ocupado', received: 8 } };
        });
        const result = await run(10);
        expect(result).toEqual({ value: { ...DONE, size: 10 } });
        expect(sent.filter(r => r.url.endsWith('/complete'))).toHaveLength(2);
    });

    it('gives up after three retries with the connection message and discards the session', async () => {
        handler = serverHandler(10, request => (request.method === 'PUT' ? { status: 0 } : undefined));
        const result = await run(10);
        expect(result).toEqual({ error: new Error(CONNECTION_LOST_MESSAGE) });
        expect(offsetsOf(sent)).toHaveLength(4);
        expect(fetchMock).toHaveBeenCalledWith('http://api/upload/chunked/u1', expect.objectContaining({ method: 'DELETE' }));
    });

    it('fails immediately on other client errors with the server message', async () => {
        handler = serverHandler(10, request => (request.method === 'PUT' ? { status: 404, body: { error: 'Envio não encontrado' } } : undefined));
        const result = await run(10);
        expect(result).toEqual({ error: new Error('Envio não encontrado') });
        expect(offsetsOf(sent)).toHaveLength(1);
    });

    it('reports the 413 of init with the server message and creates no session', async () => {
        handler = () => ({ status: 413, body: { error: 'Arquivo excede o limite de 500MB' } });
        const result = await run(10);
        expect(result).toEqual({ error: new Error('Arquivo excede o limite de 500MB') });
        expect(sent).toHaveLength(1);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('clears the token on 401', async () => {
        const onUnauthorized = vi.fn();
        handler = () => ({ status: 401, body: { error: 'Token inválido ou expirado' } });
        const result = await run(10, { onUnauthorized });
        expect(result).toEqual({ error: new Error('Token inválido ou expirado') });
        expect(onUnauthorized).toHaveBeenCalledTimes(1);
    });

    it('aborts the running chunk, discards the session and rejects with an AbortError', async () => {
        const controller = new AbortController();
        handler = serverHandler(10, (request) => {
            if (request.method !== 'PUT') return undefined;
            queueMicrotask(() => controller.abort());
            return 'hang';
        });
        const result = await run(10, { signal: controller.signal });
        expect('error' in result && isAbortError(result.error)).toBe(true);
        expect(fetchMock).toHaveBeenCalledWith('http://api/upload/chunked/u1', expect.objectContaining({ method: 'DELETE' }));
    });

    it('rejects right away when the signal is already aborted', async () => {
        handler = serverHandler(10);
        const controller = new AbortController();
        controller.abort();
        const result = await run(10, { signal: controller.signal });
        expect('error' in result && isAbortError(result.error)).toBe(true);
        expect(sent).toHaveLength(0);
    });
});
