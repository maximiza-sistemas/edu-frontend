/**
 * Chunked upload engine for videos and presentations.
 *
 * The production reverse proxy cuts any request that runs for more than ~60s, so a large file is sent as
 * small PUT requests (one per chunk) to the backend's /upload/chunked API:
 *   POST init -> PUT ?offset=n (each chunk, retried/resynced) -> POST complete   (DELETE on cancel/failure)
 * It only depends on XMLHttpRequest/fetch and the config passed in, so it also runs outside Vite.
 */

export const UPLOAD_CANCELLED_MESSAGE = 'Envio cancelado';
export const CONNECTION_LOST_MESSAGE = 'A conexão foi interrompida durante o envio. Verifique a internet e tente novamente.';
export const FILE_TOO_LARGE_MESSAGE = 'Arquivo maior que o limite permitido';

// Below the proxy's 60s limit; a 4MB chunk needs ~34s on a 1 Mbps uplink
export const CHUNK_REQUEST_TIMEOUT_MS = 50_000;
// Waits before the 1st, 2nd and 3rd retry of a failed request
export const RETRY_DELAYS_MS: readonly number[] = [1000, 3000, 6000];
// After a network error or timeout the chunk is halved (down to this size) so very slow links still fit
export const MIN_CHUNK_SIZE = 1024 * 1024;
// Consecutive 409 resyncs without progress before giving up (protects against a server/client loop)
const MAX_RESYNCS = 5;

export type ChunkedUploadKind = 'video' | 'presentation';
export type FailureAction = 'retry' | 'resync' | 'fail';

export interface ChunkedUploadConfig {
    // API root, e.g. https://host/api
    baseUrl: string;
    getToken: () => string | null;
    // Called on 401 (the stored token is no longer valid)
    onUnauthorized: () => void;
}

export interface ChunkedUploadRequest {
    kind: ChunkedUploadKind;
    file: File;
    fallbackError: string;
    onProgress?: (percent: number) => void;
    signal?: AbortSignal;
}

interface HttpResult {
    // 0 when the request failed without a response (network error, proxy reset, timeout)
    status: number;
    body: Record<string, unknown>;
}

interface HttpRequest {
    method: string;
    url: string;
    token: string | null;
    body?: Blob | string;
    contentType?: string;
    signal?: AbortSignal;
    onUploadProgress?: (loaded: number) => void;
}

interface UploadContext {
    config: ChunkedUploadConfig;
    request: ChunkedUploadRequest;
}

interface UploadSession {
    uploadId: string;
    chunkSize: number;
}

// ============== Pure helpers ==============

export function createAbortError(): Error {
    return Object.assign(new Error(UPLOAD_CANCELLED_MESSAGE), { name: 'AbortError' });
}

export function isAbortError(err: unknown): boolean {
    return err instanceof Error && err.name === 'AbortError';
}

/** End (exclusive) of the chunk that starts at offset. */
export function getChunkEnd(offset: number, chunkSize: number, fileSize: number): number {
    return Math.min(offset + chunkSize, fileSize);
}

/** Every [start, end) range a file is split into. */
export function listChunkRanges(fileSize: number, chunkSize: number): Array<{ start: number; end: number }> {
    const ranges: Array<{ start: number; end: number }> = [];
    for (let start = 0; start < fileSize; start = getChunkEnd(start, chunkSize, fileSize)) {
        ranges.push({ start, end: getChunkEnd(start, chunkSize, fileSize) });
    }
    return ranges;
}

/** Whole percent of the file confirmed by the server plus what the current chunk has sent so far. */
export function computeProgress(confirmedBytes: number, currentChunkLoaded: number, fileSize: number): number {
    if (fileSize <= 0) return 0;
    const percent = Math.round(((confirmedBytes + currentChunkLoaded) / fileSize) * 100);
    return Math.min(100, Math.max(0, percent));
}

/** What to do after a request failed with this status (0 = no response). */
export function classifyFailure(status: number): FailureAction {
    if (status === 0 || status === 408 || status === 429 || status >= 500) return 'retry';
    if (status === 409) return 'resync';
    return 'fail';
}

/** Delay before retry number `attempt` (0-based), or null when no retries are left. */
export function getRetryDelay(attempt: number): number | null {
    return attempt >= 0 && attempt < RETRY_DELAYS_MS.length ? RETRY_DELAYS_MS[attempt] : null;
}

/** Half the chunk size, never below MIN_CHUNK_SIZE (and never larger than the current size). */
export function reduceChunkSize(chunkSize: number): number {
    return chunkSize <= MIN_CHUNK_SIZE ? chunkSize : Math.max(MIN_CHUNK_SIZE, Math.floor(chunkSize / 2));
}

/** Server-confirmed byte count from a chunk response, or null when absent or out of range. */
export function readReceived(body: Record<string, unknown>, fileSize: number): number | null {
    const received = body.received;
    return typeof received === 'number' && Number.isSafeInteger(received) && received >= 0 && received <= fileSize
        ? received
        : null;
}

// ============== HTTP ==============

function parseBody(text: string): Record<string, unknown> {
    try {
        const parsed: unknown = JSON.parse(text);
        return typeof parsed === 'object' && parsed !== null ? parsed as Record<string, unknown> : {};
    } catch {
        // Non-JSON body (e.g. a proxy error page)
        return {};
    }
}

// XHR (not fetch) because fetch does not report upload progress. Rejects only when aborted.
function sendRequest({ method, url, token, body, contentType, signal, onUploadProgress }: HttpRequest): Promise<HttpResult> {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(createAbortError());
            return;
        }
        const xhr = new XMLHttpRequest();
        const abortRequest = () => xhr.abort();
        signal?.addEventListener('abort', abortRequest, { once: true });
        const settle = (finish: () => void) => {
            signal?.removeEventListener('abort', abortRequest);
            finish();
        };

        xhr.open(method, url);
        xhr.timeout = CHUNK_REQUEST_TIMEOUT_MS;
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        if (contentType) xhr.setRequestHeader('Content-Type', contentType);
        if (onUploadProgress) {
            xhr.upload.onprogress = (event) => onUploadProgress(event.loaded);
        }
        xhr.onload = () => settle(() => resolve({ status: xhr.status, body: parseBody(xhr.responseText) }));
        xhr.onerror = () => settle(() => resolve({ status: 0, body: {} }));
        xhr.ontimeout = () => settle(() => resolve({ status: 0, body: {} }));
        xhr.onabort = () => settle(() => reject(createAbortError()));
        xhr.send(body ?? null);
    });
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(createAbortError());
            return;
        }
        const onAbort = () => {
            clearTimeout(timer);
            reject(createAbortError());
        };
        const timer = setTimeout(() => {
            signal?.removeEventListener('abort', onAbort);
            resolve();
        }, ms);
        signal?.addEventListener('abort', onAbort, { once: true });
    });
}

function toUploadError({ config, request }: UploadContext, { status, body }: HttpResult): Error {
    if (status === 401) config.onUnauthorized();
    if (typeof body.error === 'string' && body.error) return new Error(body.error);
    if (status === 0) return new Error(CONNECTION_LOST_MESSAGE);
    if (status === 413) return new Error(FILE_TOO_LARGE_MESSAGE);
    return new Error(request.fallbackError);
}

function apiRequest(ctx: UploadContext, request: Omit<HttpRequest, 'url' | 'token' | 'signal'> & { path: string }): Promise<HttpResult> {
    return sendRequest({
        ...request,
        url: `${ctx.config.baseUrl}${request.path}`,
        token: ctx.config.getToken(),
        signal: ctx.request.signal
    });
}

/**
 * Sends a request, retrying network errors, 408, 429, 5xx and 409 (complete while a chunk is still being
 * written) with backoff; returns the final 2xx result.
 */
async function requestWithRetry(ctx: UploadContext, send: () => Promise<HttpResult>): Promise<HttpResult> {
    for (let attempt = 0; ; attempt += 1) {
        const result = await send();
        if (result.status >= 200 && result.status < 300) return result;
        const delay = classifyFailure(result.status) === 'fail' ? null : getRetryDelay(attempt);
        if (delay === null) throw toUploadError(ctx, result);
        await wait(delay, ctx.request.signal);
    }
}

// ============== Protocol steps ==============

async function initSession(ctx: UploadContext): Promise<UploadSession> {
    const { kind, file } = ctx.request;
    const { body } = await requestWithRetry(ctx, () => apiRequest(ctx, {
        method: 'POST',
        path: '/upload/chunked/init',
        contentType: 'application/json',
        body: JSON.stringify({ kind, filename: file.name, size: file.size, mimeType: file.type })
    }));
    const { uploadId, chunkSize } = body;
    if (typeof uploadId !== 'string' || typeof chunkSize !== 'number' || !(chunkSize > 0)) {
        throw new Error(ctx.request.fallbackError);
    }
    return { uploadId, chunkSize };
}

function sendChunk(ctx: UploadContext, uploadId: string, start: number, end: number): Promise<HttpResult> {
    const { file, onProgress } = ctx.request;
    return apiRequest(ctx, {
        method: 'PUT',
        path: `/upload/chunked/${encodeURIComponent(uploadId)}?offset=${start}`,
        contentType: 'application/octet-stream',
        body: file.slice(start, end),
        onUploadProgress: onProgress ? (loaded) => onProgress(computeProgress(start, loaded, file.size)) : undefined
    });
}

/** Sends every chunk in order; a 409 moves to the server's position, transient failures are retried. */
async function sendAllChunks(ctx: UploadContext, { uploadId, chunkSize: maxChunkSize }: UploadSession): Promise<void> {
    const { file, signal, onProgress } = ctx.request;
    let offset = 0;
    let chunkSize = maxChunkSize;
    let attempt = 0;
    let resyncs = 0;
    while (offset < file.size) {
        const end = getChunkEnd(offset, chunkSize, file.size);
        const result = await sendChunk(ctx, uploadId, offset, end);
        const serverReceived = readReceived(result.body, file.size);
        if (result.status === 200) {
            offset = serverReceived ?? end;
            attempt = 0;
            resyncs = 0;
            onProgress?.(computeProgress(offset, 0, file.size));
            continue;
        }
        const action = classifyFailure(result.status);
        if (action === 'resync' && serverReceived !== null && serverReceived !== offset && resyncs < MAX_RESYNCS) {
            offset = serverReceived;
            resyncs += 1;
            continue;
        }
        // 409 without a new position means another write is still running: wait like a transient error
        const delay = action === 'fail' ? null : getRetryDelay(attempt);
        if (delay === null) throw toUploadError(ctx, result);
        attempt += 1;
        if (result.status === 0) chunkSize = reduceChunkSize(chunkSize);
        await wait(delay, signal);
    }
}

// Fire-and-forget: frees the server's temporary file; the session also expires on its own.
// Uses the token of the upload, which a 401 may already have removed from storage.
function discardSession({ config }: UploadContext, uploadId: string, token: string | null): void {
    void fetch(`${config.baseUrl}/upload/chunked/${encodeURIComponent(uploadId)}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        keepalive: true
    }).catch(() => undefined);
}

/**
 * Uploads a file through the chunked protocol and resolves with the server's final JSON (the same shape
 * as the single-request upload endpoints). Aborting the signal rejects with an AbortError.
 */
export async function uploadFileInChunks<T>(config: ChunkedUploadConfig, request: ChunkedUploadRequest): Promise<T> {
    const ctx: UploadContext = { config, request };
    if (request.signal?.aborted) throw createAbortError();
    const token = config.getToken();
    const session = await initSession(ctx);
    try {
        await sendAllChunks(ctx, session);
        const { body } = await requestWithRetry(ctx, () => apiRequest(ctx, {
            method: 'POST',
            path: `/upload/chunked/${encodeURIComponent(session.uploadId)}/complete`
        }));
        request.onProgress?.(100);
        return body as T;
    } catch (err) {
        discardSession(ctx, session.uploadId, token);
        throw err;
    }
}
