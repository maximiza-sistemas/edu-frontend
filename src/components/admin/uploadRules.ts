import {
    MAX_PRESENTATION_SIZE_MB,
    MAX_VIDEO_SIZE_MB,
    isAllowedPresentationFile,
    isAllowedVideoFile,
    parseExternalVideoUrl
} from '../../utils/media';

export const BYTES_PER_MB = 1024 * 1024;

// Backend MAX_FILE_SIZE_MB for PDFs (uploadController.ts)
export const MAX_PDF_SIZE_MB = 50;
// Stricter than the backend image limit on purpose: covers are shown in grids
export const MAX_COVER_SIZE_MB = 5;
// books.media_url is VARCHAR(1024); the backend rejects longer links
export const MAX_VIDEO_LINK_LENGTH = 1024;

export const INVALID_VIDEO_LINK_MESSAGE = 'Informe um link válido do YouTube ou Vimeo.';
export const VIDEO_LINK_TOO_LONG_MESSAGE = `O link do vídeo deve ter no máximo ${MAX_VIDEO_LINK_LENGTH} caracteres. Copie o endereço do vídeo sem os parâmetros extras.`;
export const PRESENTATION_LIMIT_HINT = `O limite de ${MAX_PRESENTATION_SIZE_MB}MB vem do visualizador online do PowerPoint. `
    + 'Se o arquivo for maior, use "Compactar Imagens" no PowerPoint e salve novamente.';

/** Returns an error message for a file that cannot be uploaded, or null when it is accepted. */
export type FileValidator = (file: File) => string | null;

/**
 * Multer (busboy) rejects a file whose size reaches its `fileSize` limit,
 * so a file of exactly the limit is already too big for the backend.
 */
export function exceedsUploadLimit(file: Pick<File, 'size'>, maxSizeMb: number): boolean {
    return file.size >= maxSizeMb * BYTES_PER_MB;
}

export function formatFileSize(file: Pick<File, 'size'>): string {
    return `${(file.size / BYTES_PER_MB).toFixed(2)} MB`;
}

const sizeLimitMessage = (maxSizeMb: number) => `O arquivo deve ter menos de ${maxSizeMb}MB.`;

export const validatePdfFile: FileValidator = file => {
    if (file.type !== 'application/pdf') return 'Apenas arquivos PDF são permitidos.';
    if (exceedsUploadLimit(file, MAX_PDF_SIZE_MB)) return sizeLimitMessage(MAX_PDF_SIZE_MB);
    return null;
};

export const validateCoverFile: FileValidator = file => {
    if (!file.type.startsWith('image/')) return 'Apenas arquivos de imagem são permitidos.';
    if (exceedsUploadLimit(file, MAX_COVER_SIZE_MB)) return sizeLimitMessage(MAX_COVER_SIZE_MB);
    return null;
};

export const validateVideoFile: FileValidator = file => {
    if (!isAllowedVideoFile(file)) return 'Apenas vídeos MP4, WebM, OGV ou M4V são permitidos.';
    if (exceedsUploadLimit(file, MAX_VIDEO_SIZE_MB)) return sizeLimitMessage(MAX_VIDEO_SIZE_MB);
    return null;
};

export const validatePresentationFile: FileValidator = file => {
    if (!isAllowedPresentationFile(file)) return 'Apenas apresentações PowerPoint (.pptx ou .ppt) são permitidas.';
    if (exceedsUploadLimit(file, MAX_PRESENTATION_SIZE_MB)) {
        return `${sizeLimitMessage(MAX_PRESENTATION_SIZE_MB)} ${PRESENTATION_LIMIT_HINT}`;
    }
    return null;
};

/** Validates a YouTube/Vimeo link the same way the backend does. An empty link is allowed (media is optional). */
export function validateVideoLink(raw: string): string | null {
    const link = raw.trim();
    if (!link) return null;
    if (link.length > MAX_VIDEO_LINK_LENGTH) return VIDEO_LINK_TOO_LONG_MESSAGE;
    return parseExternalVideoUrl(link) ? null : INVALID_VIDEO_LINK_MESSAGE;
}
