import { PlayCircle } from 'lucide-react';
import { parseExternalVideoUrl } from '../../utils/media';
import type { VideoSource } from '../../utils/media';
import { validateVideoLink } from './uploadRules';

interface VideoLinkFieldProps {
    id: string;
    value: string;
    coverUrl: string;
    onChange: (value: string) => void;
}

const getLinkHint = (source: VideoSource, coverUrl: string) => {
    if (source.kind !== 'youtube') return 'Link reconhecido. Envie uma imagem no campo Capa, se desejar.';
    return coverUrl === source.thumbnailUrl ? 'A miniatura do vídeo será usada como capa.' : 'Link reconhecido.';
};

function VideoLinkPreview({ source, coverUrl, hintId }: { source: VideoSource; coverUrl: string; hintId: string }) {
    return (
        <div className="video-link-preview">
            {source.kind === 'youtube' ? (
                <img src={source.thumbnailUrl} alt="Miniatura do vídeo" className="video-link-thumb" />
            ) : (
                <div className="video-link-thumb video-link-thumb-empty">
                    <PlayCircle size={28} aria-hidden="true" />
                </div>
            )}
            <div className="video-link-info">
                <span className="video-link-provider">
                    {source.kind === 'youtube' ? 'Vídeo do YouTube' : 'Vídeo do Vimeo'}
                </span>
                <span id={hintId} className="upload-hint">{getLinkHint(source, coverUrl)}</span>
            </div>
        </div>
    );
}

/** YouTube/Vimeo link input with the same validation (format and length) as the backend. */
export default function VideoLinkField({ id, value, coverUrl, onChange }: VideoLinkFieldProps) {
    const error = validateVideoLink(value);
    const source = error ? null : parseExternalVideoUrl(value);
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;

    return (
        <div className="pdf-upload-container">
            <input
                id={id}
                type="url"
                inputMode="url"
                className={`input ${error ? 'input-invalid' : ''}`}
                placeholder="https://www.youtube.com/watch?v=..."
                value={value}
                onChange={e => onChange(e.target.value)}
                aria-label="Link do vídeo no YouTube ou Vimeo"
                aria-invalid={!!error}
                aria-describedby={error ? errorId : hintId}
            />
            {error && <p id={errorId} className="upload-error" role="alert">{error}</p>}
            {source && <VideoLinkPreview source={source} coverUrl={coverUrl} hintId={hintId} />}
            {!source && !error && (
                <span id={hintId} className="upload-hint">Cole o endereço de um vídeo do YouTube ou do Vimeo.</span>
            )}
        </div>
    );
}
