import { FileText, Link as LinkIcon, PlayCircle, Presentation, Upload } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { MAX_PRESENTATION_SIZE_MB, MAX_VIDEO_SIZE_MB, PRESENTATION_ACCEPT, VIDEO_ACCEPT } from '../../utils/media';
import FileUploadField from './FileUploadField';
import type { MaterialForm, VideoSourceMode } from './materialForm';
import type { MaterialMedia } from './useMaterialMedia';
import VideoLinkField from './VideoLinkField';
import {
    MAX_PDF_SIZE_MB,
    PRESENTATION_LIMIT_HINT,
    validatePdfFile,
    validatePresentationFile,
    validateVideoFile
} from './uploadRules';

interface MaterialMediaFieldProps {
    form: MaterialForm;
    media: MaterialMedia;
}

const VIDEO_SOURCE_OPTIONS: { value: VideoSourceMode; label: string; icon: LucideIcon }[] = [
    { value: 'upload', label: 'Enviar arquivo', icon: Upload },
    { value: 'link', label: 'Link do YouTube/Vimeo', icon: LinkIcon }
];

function PdfField({ form, media }: MaterialMediaFieldProps) {
    return (
        <div className="input-group">
            <label>Arquivo PDF</label>
            <FileUploadField
                id="material-pdf"
                upload={media.pdf}
                accept=".pdf,application/pdf"
                validate={validatePdfFile}
                icon={FileText}
                selectText="Clique para selecionar um PDF"
                hint={`Menos de ${MAX_PDF_SIZE_MB}MB`}
                successText="PDF enviado com sucesso!"
                onUpload={media.uploadPdf}
                attachedText={form.pdfUrl ? 'PDF anexado' : undefined}
                onRemove={media.removePdf}
            />
        </div>
    );
}

function VideoSourceToggle({ form, media }: MaterialMediaFieldProps) {
    return (
        <div className="media-source-toggle" role="group" aria-labelledby="video-source-label">
            {VIDEO_SOURCE_OPTIONS.map(({ value, label, icon: OptionIcon }) => {
                const isActive = form.videoSourceMode === value;
                return (
                    <button
                        key={value}
                        type="button"
                        className={`media-source-option ${isActive ? 'active' : ''}`}
                        aria-pressed={isActive}
                        onClick={() => media.changeVideoSourceMode(value)}
                        disabled={media.media.isUploading}
                    >
                        <OptionIcon size={16} aria-hidden="true" />
                        <span>{label}</span>
                    </button>
                );
            })}
        </div>
    );
}

function VideoField({ form, media }: MaterialMediaFieldProps) {
    return (
        <div className="input-group">
            <label id="video-source-label">Vídeo</label>
            <VideoSourceToggle form={form} media={media} />
            {form.videoSourceMode === 'upload' ? (
                <FileUploadField
                    id="material-video"
                    upload={media.media}
                    accept={VIDEO_ACCEPT}
                    validate={validateVideoFile}
                    icon={PlayCircle}
                    selectText="Clique para selecionar um vídeo"
                    hint={`MP4, WebM, OGV ou M4V (menos de ${MAX_VIDEO_SIZE_MB}MB)`}
                    successText="Vídeo enviado com sucesso!"
                    onUpload={media.uploadMedia}
                    attachedText={form.mediaUrl ? 'Vídeo anexado' : undefined}
                    onRemove={media.removeMedia}
                    showProgress
                />
            ) : (
                <VideoLinkField
                    id="material-video-link"
                    value={form.mediaUrl}
                    coverUrl={form.coverUrl}
                    onChange={media.changeVideoLink}
                />
            )}
        </div>
    );
}

function PresentationField({ form, media }: MaterialMediaFieldProps) {
    return (
        <div className="input-group">
            <label>Arquivo da apresentação</label>
            <FileUploadField
                id="material-presentation"
                upload={media.media}
                accept={PRESENTATION_ACCEPT}
                validate={validatePresentationFile}
                icon={Presentation}
                selectText="Clique para selecionar uma apresentação"
                hint={`PPTX ou PPT (menos de ${MAX_PRESENTATION_SIZE_MB}MB)`}
                successText="Apresentação enviada com sucesso!"
                onUpload={media.uploadMedia}
                attachedText={form.mediaUrl ? 'Apresentação anexada' : undefined}
                onRemove={media.removeMedia}
                showProgress
            />
            <span className="upload-hint">{PRESENTATION_LIMIT_HINT}</span>
            <span className="upload-hint">
                A capa não é gerada automaticamente para apresentações. Envie uma imagem no campo Capa.
            </span>
        </div>
    );
}

/** Format-specific part of the material form: the PDF file, the video (file or link) or the presentation file. */
export default function MaterialMediaField({ form, media }: MaterialMediaFieldProps) {
    if (form.contentType === 'video') return <VideoField form={form} media={media} />;
    if (form.contentType === 'pptx') return <PresentationField form={form} media={media} />;
    return <PdfField form={form} media={media} />;
}
