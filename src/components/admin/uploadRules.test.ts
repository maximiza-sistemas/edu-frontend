import { describe, expect, it } from 'vitest';
import { MAX_PRESENTATION_SIZE_MB, MAX_VIDEO_SIZE_MB } from '../../utils/media';
import {
    BYTES_PER_MB,
    INVALID_VIDEO_LINK_MESSAGE,
    MAX_COVER_SIZE_MB,
    MAX_PDF_SIZE_MB,
    MAX_VIDEO_LINK_LENGTH,
    VIDEO_LINK_TOO_LONG_MESSAGE,
    exceedsUploadLimit,
    formatFileSize,
    validateCoverFile,
    validatePdfFile,
    validatePresentationFile,
    validateVideoFile,
    validateVideoLink
} from './uploadRules';

const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

// File with a given size without allocating it
function fakeFile(name: string, type: string, size: number): File {
    const file = new File([''], name, { type });
    Object.defineProperty(file, 'size', { value: size });
    return file;
}

describe('exceedsUploadLimit', () => {
    it('accepts a file one byte under the limit', () => {
        expect(exceedsUploadLimit({ size: 10 * BYTES_PER_MB - 1 }, 10)).toBe(false);
    });

    it('rejects a file of exactly the limit, like multer/busboy does', () => {
        expect(exceedsUploadLimit({ size: 10 * BYTES_PER_MB }, 10)).toBe(true);
    });

    it('rejects a file over the limit', () => {
        expect(exceedsUploadLimit({ size: 10 * BYTES_PER_MB + 1 }, 10)).toBe(true);
    });
});

describe('formatFileSize', () => {
    it('formats bytes as megabytes with two decimals', () => {
        expect(formatFileSize({ size: 1.5 * BYTES_PER_MB })).toBe('1.50 MB');
    });
});

describe('file validators', () => {
    it('accepts a PDF under the limit and rejects other types or the exact limit', () => {
        expect(validatePdfFile(fakeFile('a.pdf', 'application/pdf', 1024))).toBeNull();
        expect(validatePdfFile(fakeFile('a.txt', 'text/plain', 1024))).toMatch(/PDF/);
        expect(validatePdfFile(fakeFile('a.pdf', 'application/pdf', MAX_PDF_SIZE_MB * BYTES_PER_MB))).toMatch(/menos de 50MB/);
    });

    it('accepts images under the cover limit only', () => {
        expect(validateCoverFile(fakeFile('c.png', 'image/png', 1024))).toBeNull();
        expect(validateCoverFile(fakeFile('c.pdf', 'application/pdf', 1024))).toMatch(/imagem/);
        expect(validateCoverFile(fakeFile('c.png', 'image/png', MAX_COVER_SIZE_MB * BYTES_PER_MB))).not.toBeNull();
    });

    it('checks video type and size against the shared limit', () => {
        expect(validateVideoFile(fakeFile('v.mp4', 'video/mp4', 1024))).toBeNull();
        expect(validateVideoFile(fakeFile('v.avi', 'video/x-msvideo', 1024))).toMatch(/MP4/);
        expect(validateVideoFile(fakeFile('v.mp4', 'video/mp4', MAX_VIDEO_SIZE_MB * BYTES_PER_MB))).toMatch(`${MAX_VIDEO_SIZE_MB}MB`);
    });

    it('explains the PowerPoint viewer limit when a presentation is too big', () => {
        expect(validatePresentationFile(fakeFile('s.pptx', PPTX_MIME, 1024))).toBeNull();
        expect(validatePresentationFile(fakeFile('s.key', 'application/octet-stream', 1024))).toMatch(/PowerPoint/);
        const tooBig = validatePresentationFile(fakeFile('s.pptx', PPTX_MIME, MAX_PRESENTATION_SIZE_MB * BYTES_PER_MB));
        expect(tooBig).toMatch(`${MAX_PRESENTATION_SIZE_MB}MB`);
        expect(tooBig).toMatch(/Compactar Imagens/);
    });
});

describe('validateVideoLink', () => {
    const youtube = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

    it('allows an empty link because media is optional', () => {
        expect(validateVideoLink('   ')).toBeNull();
    });

    it('accepts YouTube and Vimeo links', () => {
        expect(validateVideoLink(youtube)).toBeNull();
        expect(validateVideoLink(' https://vimeo.com/76979871 ')).toBeNull();
    });

    it('rejects links from other sites', () => {
        expect(validateVideoLink('https://example.com/video.mp4')).toBe(INVALID_VIDEO_LINK_MESSAGE);
    });

    it('accepts a link of exactly the maximum length and rejects a longer one', () => {
        const padTo = (length: number) => `${youtube}&x=${'a'.repeat(length - youtube.length - 3)}`;
        expect(padTo(MAX_VIDEO_LINK_LENGTH)).toHaveLength(MAX_VIDEO_LINK_LENGTH);
        expect(validateVideoLink(padTo(MAX_VIDEO_LINK_LENGTH))).toBeNull();
        expect(validateVideoLink(padTo(MAX_VIDEO_LINK_LENGTH + 1))).toBe(VIDEO_LINK_TOO_LONG_MESSAGE);
    });
});
