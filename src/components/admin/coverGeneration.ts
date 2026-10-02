import { isAbortError, uploadApi } from '../../services/api';

// Automatic covers: generated in the browser from the first PDF page or an early video frame, then uploaded.
// Every helper is best effort: it resolves with null instead of failing the upload it belongs to.

const COVER_JPEG_QUALITY = 0.8;
const PDF_COVER_SCALE = 1.5;

// Frame position, output width cap and how long decoding may take for video covers
const VIDEO_COVER_FRAME_SECONDS = 1;
const VIDEO_COVER_MAX_WIDTH = 1280;
const VIDEO_COVER_TIMEOUT_MS = 10000;

const canvasToJpeg = (canvas: HTMLCanvasElement): Promise<Blob | null> => new Promise(resolve =>
    canvas.toBlob(resolve, 'image/jpeg', COVER_JPEG_QUALITY)
);

async function uploadCoverImage(blob: Blob, signal?: AbortSignal): Promise<string | null> {
    if (signal?.aborted) return null;
    const coverFile = new File([blob], `cover-${Date.now()}.jpg`, { type: 'image/jpeg' });
    const result = await uploadApi.uploadImage(coverFile, signal);
    return result.imageUrl || null;
}

async function renderPdfFirstPage(file: File): Promise<Blob | null> {
    const { pdfjs } = await import('react-pdf');
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
    }

    const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: PDF_COVER_SCALE });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return null;

    canvas.height = viewport.height;
    canvas.width = viewport.width;
    await page.render({ canvasContext: context, viewport } as Parameters<typeof page.render>[0]).promise;
    return canvasToJpeg(canvas);
}

// Resolves with a JPEG frame near the start of a local video file, or null when the browser cannot decode it
function captureVideoFrame(file: File): Promise<Blob | null> {
    return new Promise(resolve => {
        const objectUrl = URL.createObjectURL(file);
        const video = document.createElement('video');
        let isDone = false;

        const finish = (blob: Blob | null) => {
            if (isDone) return;
            isDone = true;
            window.clearTimeout(timeoutId);
            video.onloadeddata = null;
            video.onseeked = null;
            video.onerror = null;
            video.removeAttribute('src');
            video.load();
            URL.revokeObjectURL(objectUrl);
            resolve(blob);
        };
        const timeoutId = window.setTimeout(() => finish(null), VIDEO_COVER_TIMEOUT_MS);

        video.muted = true;
        video.playsInline = true;
        video.preload = 'auto';
        video.onerror = () => finish(null);
        video.onloadeddata = () => {
            const hasDuration = Number.isFinite(video.duration) && video.duration > 0;
            video.currentTime = hasDuration
                ? Math.min(VIDEO_COVER_FRAME_SECONDS, video.duration / 2)
                : VIDEO_COVER_FRAME_SECONDS;
        };
        video.onseeked = () => {
            const scale = Math.min(1, VIDEO_COVER_MAX_WIDTH / (video.videoWidth || 1));
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(video.videoWidth * scale);
            canvas.height = Math.round(video.videoHeight * scale);
            const context = canvas.getContext('2d');
            if (!context || !canvas.width || !canvas.height) {
                finish(null);
                return;
            }
            try {
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                canvas.toBlob(finish, 'image/jpeg', COVER_JPEG_QUALITY);
            } catch {
                finish(null);
            }
        };
        video.src = objectUrl;
    });
}

async function generateCover(render: () => Promise<Blob | null>, signal: AbortSignal | undefined, label: string): Promise<string | null> {
    try {
        const image = await render();
        return image ? await uploadCoverImage(image, signal) : null;
    } catch (err) {
        if (!isAbortError(err)) console.error(`Failed to generate ${label} cover:`, err);
        return null;
    }
}

export function generateCoverFromPdf(file: File, signal?: AbortSignal): Promise<string | null> {
    return generateCover(() => renderPdfFirstPage(file), signal, 'PDF');
}

export function generateCoverFromVideo(file: File, signal?: AbortSignal): Promise<string | null> {
    return generateCover(() => captureVideoFrame(file), signal, 'video');
}
