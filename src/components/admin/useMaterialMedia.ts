import { useCallback, useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { uploadApi } from '../../services/api';
import type { ContentType } from '../../types';
import { generateCoverFromPdf, generateCoverFromVideo } from './coverGeneration';
import {
    applyGeneratedCover,
    applyManualCover,
    applyVideoLink,
    canReplaceCover,
    getDiscardWarning,
    switchContentType,
    switchVideoSourceMode,
    withoutMedia,
    withoutPdf
} from './materialForm';
import type { MaterialForm, MediaContentType, PendingFiles, VideoSourceMode } from './materialForm';
import { useFileUpload } from './useFileUpload';
import type { FileUpload, UploadContext } from './useFileUpload';

const MISSING_URL_MESSAGE = 'O servidor não retornou o endereço do arquivo';

type MediaUploader = (file: File, context: UploadContext) => Promise<string | undefined>;

const MEDIA_UPLOADERS: Record<MediaContentType, MediaUploader> = {
    video: async (file, { signal, onProgress }) => (await uploadApi.uploadVideo(file, { signal, onProgress })).videoUrl,
    pptx: async (file, { signal, onProgress }) => (await uploadApi.uploadPresentation(file, { signal, onProgress })).presentationUrl
};

export interface MaterialMedia {
    pdf: FileUpload;
    cover: FileUpload;
    media: FileUpload;
    isAnyUploading: boolean;
    pendingFiles: PendingFiles;
    uploadPdf: () => void;
    uploadCover: () => void;
    uploadMedia: () => void;
    removePdf: () => void;
    removeMedia: () => void;
    changeContentType: (contentType: ContentType) => void;
    changeVideoSourceMode: (mode: VideoSourceMode) => void;
    changeVideoLink: (link: string) => void;
    resetAll: () => void;
}

// Browsers show their own generic text; returning a value is what triggers the prompt
function useWarnBeforeUnload(isActive: boolean) {
    useEffect(() => {
        if (!isActive) return undefined;
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isActive]);
}

function requireUrl(url: string | undefined): string {
    if (!url) throw new Error(MISSING_URL_MESSAGE);
    return url;
}

/**
 * Upload state and handlers for the material form: PDF, cover and video/presentation files,
 * the video link, and format switches. Results are only written while the upload is still current.
 */
export function useMaterialMedia(form: MaterialForm, setForm: Dispatch<SetStateAction<MaterialForm>>): MaterialMedia {
    const pdf = useFileUpload();
    const cover = useFileUpload();
    const media = useFileUpload();
    const isAnyUploading = pdf.isUploading || cover.isUploading || media.isUploading;
    useWarnBeforeUnload(isAnyUploading);

    const { reset: resetPdf } = pdf;
    const { reset: resetCover } = cover;
    const { reset: resetMedia } = media;
    const resetAll = useCallback(() => {
        resetPdf();
        resetCover();
        resetMedia();
    }, [resetPdf, resetCover, resetMedia]);

    const uploadPdf = () => pdf.start(async (file, context) => {
        const pdfUrl = requireUrl((await uploadApi.uploadPdf(file, context.signal)).pdfUrl);
        // A new PDF also replaces a stored cover, which usually came from the previous PDF
        const coverUrl = canReplaceCover(form.coverSource, true)
            ? await generateCoverFromPdf(file, context.signal)
            : null;
        if (!context.isCurrent()) return;
        setForm(prev => ({ ...applyGeneratedCover(prev, coverUrl, true), pdfUrl }));
    });

    const uploadCover = () => cover.start(async (file, context) => {
        const coverUrl = requireUrl((await uploadApi.uploadImage(file, context.signal)).imageUrl);
        if (context.isCurrent()) setForm(prev => applyManualCover(prev, coverUrl));
    });

    const uploadMedia = () => {
        if (form.contentType === 'pdf') return;
        const contentType = form.contentType;
        const shouldGenerateCover = contentType === 'video' && canReplaceCover(form.coverSource, false);
        media.start(async (file, context) => {
            const mediaUrl = requireUrl(await MEDIA_UPLOADERS[contentType](file, context));
            if (!context.isCurrent()) return;
            setForm(prev => ({ ...prev, mediaUrl }));
            if (!shouldGenerateCover) return;
            const coverUrl = await generateCoverFromVideo(file, context.signal);
            if (context.isCurrent()) setForm(prev => applyGeneratedCover(prev, coverUrl, false));
        });
    };

    const removePdf = () => {
        pdf.reset();
        setForm(withoutPdf);
    };

    const removeMedia = () => {
        media.reset();
        setForm(withoutMedia);
    };

    // Asks before a change would drop what is attached (or selected) for the current format
    const confirmDiscard = (hasPendingFile: boolean) => {
        const warning = getDiscardWarning(form, hasPendingFile);
        return !warning || window.confirm(`${warning} Deseja continuar?`);
    };

    const changeContentType = (contentType: ContentType) => {
        if (contentType === form.contentType) return;
        const pendingFile = form.contentType === 'pdf' ? pdf.file : media.file;
        if (!confirmDiscard(!!pendingFile)) return;
        pdf.reset();
        media.reset();
        setForm(prev => switchContentType(prev, contentType));
    };

    const changeVideoSourceMode = (mode: VideoSourceMode) => {
        if (mode === form.videoSourceMode || !confirmDiscard(!!media.file)) return;
        media.reset();
        setForm(prev => switchVideoSourceMode(prev, mode));
    };

    const changeVideoLink = (link: string) => setForm(prev => applyVideoLink(prev, link));

    return {
        pdf,
        cover,
        media,
        isAnyUploading,
        pendingFiles: { pdf: pdf.file, cover: cover.file, media: media.file },
        uploadPdf,
        uploadCover,
        uploadMedia,
        removePdf,
        removeMedia,
        changeContentType,
        changeVideoSourceMode,
        changeVideoLink,
        resetAll
    };
}
