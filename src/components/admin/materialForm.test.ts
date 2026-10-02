import { describe, expect, it } from 'vitest';
import type { Book } from '../../types';
import {
    AUDIENCE_OPTIONS,
    EMPTY_FORM,
    applyGeneratedCover,
    applyManualCover,
    applyVideoLink,
    buildBookPayload,
    formFromBook,
    getDiscardWarning,
    getSubmitError,
    switchContentType,
    switchVideoSourceMode,
    withoutMedia,
    withoutPdf
} from './materialForm';
import type { MaterialForm, PendingFiles } from './materialForm';

const YOUTUBE_LINK = 'https://youtu.be/dQw4w9WgXcQ';
const YOUTUBE_THUMB = 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg';
const NO_PENDING: PendingFiles = { pdf: null, cover: null, media: null };
const someFile = new File(['x'], 'x.bin');

const BASE_BOOK: Book = {
    id: 'b1',
    title: 'Livro',
    author: 'Autora',
    description: 'Descrição',
    cover_url: '/uploads/images/cover.jpg',
    pdf_url: '/uploads/pdfs/livro.pdf',
    curriculum_component: 'Matemática',
    book_type: 'student',
    class_groups: ['1º Ano']
};

const form = (overrides: Partial<MaterialForm>): MaterialForm => ({
    ...EMPTY_FORM,
    classGroups: ['1º Ano'],
    ...overrides
});

describe('AUDIENCE_OPTIONS', () => {
    it('labels the audience as Aluno / Professor', () => {
        expect(AUDIENCE_OPTIONS).toEqual([
            { value: 'student', label: 'Aluno' },
            { value: 'professor', label: 'Professor' }
        ]);
    });
});

describe('formFromBook', () => {
    it('treats a legacy row without content_type as a PDF and keeps its PDF', () => {
        const result = formFromBook(BASE_BOOK);
        expect(result.contentType).toBe('pdf');
        expect(result.pdfUrl).toBe('/uploads/pdfs/livro.pdf');
        expect(result.coverSource).toBe('stored');
    });

    it('detects link mode and a YouTube thumbnail cover', () => {
        const result = formFromBook({ ...BASE_BOOK, content_type: 'video', pdf_url: null, media_url: YOUTUBE_LINK, cover_url: YOUTUBE_THUMB });
        expect(result.videoSourceMode).toBe('link');
        expect(result.coverSource).toBe('auto');
    });

    it('uses upload mode for an uploaded video file', () => {
        const result = formFromBook({ ...BASE_BOOK, content_type: 'video', media_url: '/uploads/videos/a.mp4' });
        expect(result.videoSourceMode).toBe('upload');
    });
});

describe('buildBookPayload', () => {
    it('keeps the PDF of an edited legacy book', () => {
        const payload = buildBookPayload(formFromBook(BASE_BOOK));
        expect(payload.pdf_url).toBe('/uploads/pdfs/livro.pdf');
        expect(payload.media_url).toBeNull();
        expect(payload.content_type).toBe('pdf');
    });

    it('clears pdf_url only when the PDF was removed', () => {
        expect(buildBookPayload(withoutPdf(formFromBook(BASE_BOOK))).pdf_url).toBeNull();
    });

    it('sends the trimmed media URL and no PDF for a video', () => {
        const payload = buildBookPayload(form({ contentType: 'video', mediaUrl: `  ${YOUTUBE_LINK} `, pdfUrl: '/uploads/pdfs/old.pdf' }));
        expect(payload.media_url).toBe(YOUTUBE_LINK);
        expect(payload.pdf_url).toBeNull();
    });

    it('sends groups or level depending on the class mode', () => {
        expect(buildBookPayload(form({ classMode: 'level', level: 'N1' }))).toMatchObject({ class_groups: [], level: 'N1' });
        expect(buildBookPayload(form({ classMode: 'series' }))).toMatchObject({ class_groups: ['1º Ano'], level: null });
    });
});

describe('getSubmitError', () => {
    it('requires a level or at least one class', () => {
        expect(getSubmitError(form({ classMode: 'level', level: '' }), NO_PENDING)).toMatch(/nível/);
        expect(getSubmitError(form({ classGroups: [] }), NO_PENDING)).toMatch(/turma/);
    });

    it('blocks a selected but unsent PDF, video, presentation or cover', () => {
        expect(getSubmitError(form({ contentType: 'pdf' }), { ...NO_PENDING, pdf: someFile })).toMatch(/o PDF selecionado/);
        expect(getSubmitError(form({ contentType: 'video' }), { ...NO_PENDING, media: someFile })).toMatch(/o vídeo selecionado/);
        expect(getSubmitError(form({ contentType: 'pptx' }), { ...NO_PENDING, media: someFile })).toMatch(/a apresentação selecionada/);
        expect(getSubmitError(form({}), { ...NO_PENDING, cover: someFile })).toMatch(/a capa selecionada/);
    });

    it('validates the video link in link mode', () => {
        const linkForm = form({ contentType: 'video', videoSourceMode: 'link' });
        expect(getSubmitError({ ...linkForm, mediaUrl: 'https://example.com' }, NO_PENDING)).toMatch(/YouTube ou Vimeo/);
        expect(getSubmitError({ ...linkForm, mediaUrl: YOUTUBE_LINK }, NO_PENDING)).toBeNull();
    });
});

describe('covers', () => {
    it('never replaces a cover chosen by the admin', () => {
        const manual = applyManualCover(form({}), '/uploads/images/mine.jpg');
        expect(applyGeneratedCover(manual, '/uploads/images/auto.jpg', true).coverUrl).toBe('/uploads/images/mine.jpg');
        expect(withoutPdf({ ...manual, pdfUrl: '/x.pdf' }).coverUrl).toBe('/uploads/images/mine.jpg');
    });

    it('lets a new PDF replace a stored cover but not a new video', () => {
        const stored = form({ coverUrl: '/uploads/images/old.jpg', coverSource: 'stored' });
        expect(applyGeneratedCover(stored, '/new.jpg', true)).toMatchObject({ coverUrl: '/new.jpg', coverSource: 'auto' });
        expect(applyGeneratedCover(stored, '/new.jpg', false).coverUrl).toBe('/uploads/images/old.jpg');
    });

    it('drops an auto cover together with the file it came from', () => {
        const auto = form({ contentType: 'video', mediaUrl: '/uploads/videos/a.mp4', coverUrl: '/frame.jpg', coverSource: 'auto' });
        expect(withoutMedia(auto)).toMatchObject({ mediaUrl: '', coverUrl: '', coverSource: 'none' });
    });

    it('follows the YouTube link unless the admin chose a cover', () => {
        const linked = applyVideoLink(form({ contentType: 'video', videoSourceMode: 'link' }), YOUTUBE_LINK);
        expect(linked).toMatchObject({ coverUrl: YOUTUBE_THUMB, coverSource: 'auto' });
        expect(applyVideoLink(linked, 'https://vimeo.com/1')).toMatchObject({ coverUrl: '', coverSource: 'none' });
        const manual = applyManualCover(form({ contentType: 'video', videoSourceMode: 'link' }), '/mine.jpg');
        expect(applyVideoLink(manual, YOUTUBE_LINK).coverUrl).toBe('/mine.jpg');
    });
});

describe('switching formats', () => {
    it('drops the PDF and its generated cover when switching to video', () => {
        const pdf = form({ pdfUrl: '/a.pdf', coverUrl: '/page1.jpg', coverSource: 'auto' });
        expect(switchContentType(pdf, 'video')).toMatchObject({ contentType: 'video', pdfUrl: '', coverUrl: '', coverSource: 'none' });
    });

    it('drops the video but keeps an admin cover when switching to a presentation', () => {
        const video = applyManualCover(form({ contentType: 'video', mediaUrl: '/uploads/videos/a.mp4' }), '/mine.jpg');
        expect(switchContentType(video, 'pptx')).toMatchObject({ contentType: 'pptx', mediaUrl: '', coverUrl: '/mine.jpg' });
    });

    it('returns the same form when the format does not change', () => {
        const pdf = form({ pdfUrl: '/a.pdf' });
        expect(switchContentType(pdf, 'pdf')).toBe(pdf);
        expect(switchVideoSourceMode(pdf, 'upload')).toBe(pdf);
    });

    it('warns only when something attached or selected would be lost', () => {
        expect(getDiscardWarning(form({}), false)).toBeNull();
        expect(getDiscardWarning(form({ pdfUrl: '/a.pdf' }), false)).toMatch(/PDF anexado/);
        expect(getDiscardWarning(form({ contentType: 'pptx', mediaUrl: '/uploads/presentations/a.pptx' }), false)).toMatch(/apresentação anexada/);
        expect(getDiscardWarning(form({ contentType: 'video' }), true)).toMatch(/vídeo selecionado/);
        expect(getDiscardWarning(form({ contentType: 'video', videoSourceMode: 'link', mediaUrl: YOUTUBE_LINK }), false)).toMatch(/link/);
    });
});
