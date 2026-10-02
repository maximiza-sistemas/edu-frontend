import { BOOK_TYPES } from '../../types';
import type { Book, BookType, ContentType } from '../../types';
import { getContentType, isUploadedFilePath, parseExternalVideoUrl } from '../../utils/media';
import { validateVideoLink } from './uploadRules';

export type VideoSourceMode = 'upload' | 'link';
export type MediaContentType = Exclude<ContentType, 'pdf'>;
export type ClassMode = 'series' | 'level';

/**
 * Where the current cover came from:
 * - 'auto': generated from the attached PDF, video or YouTube link; it leaves with that file
 * - 'manual': uploaded by the admin in this form; never replaced or cleared automatically
 * - 'stored': loaded with the material, origin unknown; only a new PDF may replace it (as before)
 */
export type CoverSource = 'none' | 'auto' | 'manual' | 'stored';

export interface MaterialForm {
    title: string;
    author: string;
    description: string;
    coverUrl: string;
    coverSource: CoverSource;
    pdfUrl: string;
    contentType: ContentType;
    mediaUrl: string;
    videoSourceMode: VideoSourceMode;
    curriculumComponent: string;
    bookType: BookType;
    classGroups: string[];
    classMode: ClassMode;
    level: string;
}

export type MaterialPayload = Omit<Book, 'id' | 'created_at' | 'updated_at'>;

export interface PendingFiles {
    pdf: File | null;
    cover: File | null;
    media: File | null;
}

export const EMPTY_FORM: MaterialForm = {
    title: '',
    author: '',
    description: '',
    coverUrl: '',
    coverSource: 'none',
    pdfUrl: '',
    contentType: 'pdf',
    mediaUrl: '',
    videoSourceMode: 'upload',
    curriculumComponent: 'Matemática',
    bookType: 'student',
    classGroups: [],
    classMode: 'series',
    level: ''
};

// "Destinado a" labels for this form only; BOOK_TYPES keeps the "Livro do ..." wording used elsewhere
const AUDIENCE_LABELS: Record<BookType, string> = {
    student: 'Aluno',
    professor: 'Professor'
};

export const AUDIENCE_OPTIONS: { value: BookType; label: string }[] = BOOK_TYPES.map(type => ({
    value: type.value,
    label: AUDIENCE_LABELS[type.value] ?? type.label
}));

const REMOVED_ATTACHMENT_WARNINGS: Record<ContentType, string> = {
    pdf: 'O PDF anexado será removido deste material.',
    video: 'O vídeo anexado será removido deste material.',
    pptx: 'A apresentação anexada será removida deste material.'
};

const DISCARDED_SELECTION_WARNINGS: Record<ContentType, string> = {
    pdf: 'O PDF selecionado será descartado.',
    video: 'O vídeo selecionado será descartado.',
    pptx: 'A apresentação selecionada será descartada.'
};

const PENDING_FILE_NAMES: Record<ContentType, string> = {
    pdf: 'o PDF selecionado',
    video: 'o vídeo selecionado',
    pptx: 'a apresentação selecionada'
};

export function getYoutubeThumbnail(url: string): string | null {
    const source = parseExternalVideoUrl(url);
    return source?.kind === 'youtube' ? source.thumbnailUrl : null;
}

export function isVideoLinkMode(form: Pick<MaterialForm, 'contentType' | 'videoSourceMode'>): boolean {
    return form.contentType === 'video' && form.videoSourceMode === 'link';
}

function getStoredCoverSource(coverUrl: string, mediaUrl: string): CoverSource {
    if (!coverUrl) return 'none';
    return coverUrl === getYoutubeThumbnail(mediaUrl) ? 'auto' : 'stored';
}

export function formFromBook(book: Book): MaterialForm {
    const mediaUrl = book.media_url || '';
    const coverUrl = book.cover_url || '';
    return {
        title: book.title,
        author: book.author,
        description: book.description,
        coverUrl,
        coverSource: getStoredCoverSource(coverUrl, mediaUrl),
        pdfUrl: book.pdf_url || '',
        contentType: getContentType(book),
        mediaUrl,
        videoSourceMode: mediaUrl && !isUploadedFilePath(mediaUrl) ? 'link' : 'upload',
        curriculumComponent: book.curriculum_component || '',
        bookType: book.book_type || 'student',
        classGroups: book.class_groups || [],
        classMode: book.level ? 'level' : 'series',
        level: book.level || ''
    };
}

/** An auto-generated cover belongs to the file or link it came from, so it leaves with it. */
export function withoutAutoCover(form: MaterialForm): MaterialForm {
    return form.coverSource === 'auto' ? { ...form, coverUrl: '', coverSource: 'none' } : form;
}

export function withoutMedia(form: MaterialForm): MaterialForm {
    return withoutAutoCover({ ...form, mediaUrl: '' });
}

export function withoutPdf(form: MaterialForm): MaterialForm {
    return withoutAutoCover({ ...form, pdfUrl: '' });
}

/** Whether a cover generated from a new file may take the place of the current one. */
export function canReplaceCover(source: CoverSource, canReplaceStored: boolean): boolean {
    if (source === 'none' || source === 'auto') return true;
    return source === 'stored' && canReplaceStored;
}

export function applyGeneratedCover(form: MaterialForm, coverUrl: string | null, canReplaceStored: boolean): MaterialForm {
    if (!coverUrl || !canReplaceCover(form.coverSource, canReplaceStored)) return form;
    return { ...form, coverUrl, coverSource: 'auto' };
}

export function applyManualCover(form: MaterialForm, coverUrl: string): MaterialForm {
    return { ...form, coverUrl, coverSource: 'manual' };
}

/** Typing a YouTube link uses its thumbnail as cover unless the admin chose another cover. */
export function applyVideoLink(form: MaterialForm, link: string): MaterialForm {
    const thumbnail = getYoutubeThumbnail(link);
    const next = withoutAutoCover({ ...form, mediaUrl: link });
    if (!thumbnail || !canReplaceCover(next.coverSource, false)) return next;
    return { ...next, coverUrl: thumbnail, coverSource: 'auto' };
}

/** Drops the attachment of the current format (and any cover generated from it) before switching. */
export function switchContentType(form: MaterialForm, contentType: ContentType): MaterialForm {
    if (form.contentType === contentType) return form;
    const cleared = form.contentType === 'pdf' ? withoutPdf(form) : withoutMedia(form);
    return { ...cleared, contentType };
}

export function switchVideoSourceMode(form: MaterialForm, videoSourceMode: VideoSourceMode): MaterialForm {
    if (form.videoSourceMode === videoSourceMode) return form;
    return { ...withoutMedia(form), videoSourceMode };
}

function getAttachedUrl(form: MaterialForm): string {
    return form.contentType === 'pdf' ? form.pdfUrl : form.mediaUrl.trim();
}

/**
 * Message for the confirmation shown before an action drops the current format's attachment,
 * or null when nothing would be lost.
 */
export function getDiscardWarning(form: MaterialForm, hasPendingFile: boolean): string | null {
    if (isVideoLinkMode(form) && form.mediaUrl.trim()) return 'O link do vídeo será descartado.';
    if (getAttachedUrl(form)) return REMOVED_ATTACHMENT_WARNINGS[form.contentType];
    return hasPendingFile ? DISCARDED_SELECTION_WARNINGS[form.contentType] : null;
}

function getUnsentFileName(form: MaterialForm, pending: PendingFiles): string | null {
    if (pending.cover) return 'a capa selecionada';
    const file = form.contentType === 'pdf' ? pending.pdf : pending.media;
    return file ? PENDING_FILE_NAMES[form.contentType] : null;
}

/** Validation run before saving; returns the message to show, or null when the form can be sent. */
export function getSubmitError(form: MaterialForm, pending: PendingFiles): string | null {
    if (form.classMode === 'level' && !form.level) return 'Selecione um nível.';
    if (form.classMode === 'series' && form.classGroups.length === 0) return 'Selecione ao menos uma turma.';

    const unsentFile = getUnsentFileName(form, pending);
    if (unsentFile) return `Clique em "Enviar" para anexar ${unsentFile} antes de salvar, ou cancele a seleção.`;

    return isVideoLinkMode(form) ? validateVideoLink(form.mediaUrl) : null;
}

/** pdf_url is only cleared when the admin removed the PDF or the material is no longer a PDF. */
export function buildBookPayload(form: MaterialForm): MaterialPayload {
    const isPdf = form.contentType === 'pdf';
    const mediaUrl = form.mediaUrl.trim();
    return {
        title: form.title,
        author: form.author,
        description: form.description,
        cover_url: form.coverUrl || '',
        content_type: form.contentType,
        pdf_url: isPdf ? (form.pdfUrl || null) : null,
        media_url: isPdf ? null : (mediaUrl || null),
        curriculum_component: form.curriculumComponent,
        book_type: form.bookType,
        class_groups: form.classMode === 'series' ? form.classGroups : [],
        level: form.classMode === 'level' ? form.level : null
    };
}
