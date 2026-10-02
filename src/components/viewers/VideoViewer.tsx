import { useState } from 'react';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import type { Book } from '../../services/api';
import { resolveVideoSource } from '../../utils/media';
import type { VideoSource } from '../../utils/media';
import '../../pages/BookReader.css';
import './MediaViewer.css';

interface VideoViewerProps {
    book: Book;
    onBack: () => void;
}

interface VideoPlayerProps {
    source: VideoSource;
    title: string;
}

function VideoPlayer({ source, title }: VideoPlayerProps) {
    const [hasPlaybackError, setHasPlaybackError] = useState(false);

    if (source.kind !== 'file') {
        return (
            <div className="media-player">
                <iframe
                    src={source.embedUrl}
                    title={`Vídeo: ${title}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                />
            </div>
        );
    }

    if (hasPlaybackError) {
        return (
            <div className="media-player media-player-error" role="alert">
                <AlertTriangle size={40} />
                <p>Não foi possível reproduzir este vídeo.</p>
                <span>O arquivo pode estar indisponível ou em um formato que o seu navegador não suporta.</span>
            </div>
        );
    }

    return (
        <div className="media-player">
            <video
                src={source.url}
                controls
                controlsList="nodownload"
                playsInline
                preload="metadata"
                onContextMenu={(e) => e.preventDefault()}
                onError={() => setHasPlaybackError(true)}
            >
                Seu navegador não suporta a reprodução de vídeos.
            </video>
        </div>
    );
}

export default function VideoViewer({ book, onBack }: VideoViewerProps) {
    const source = book.media_url ? resolveVideoSource(book.media_url) : null;

    return (
        <div className="media-viewer">
            <div className="reader-header">
                <button className="btn btn-icon" onClick={onBack} title="Voltar">
                    <ArrowLeft size={20} />
                </button>
                <div className="reader-title">
                    <h1>{book.title}</h1>
                    <span className="reader-author">{book.author}</span>
                </div>
            </div>

            <div className="media-viewer-content">
                <div className="media-viewer-stage">
                    {source ? (
                        <VideoPlayer source={source} title={book.title} />
                    ) : (
                        <div className="media-player media-player-error" role="alert">
                            <AlertTriangle size={40} />
                            <p>Link de vídeo não suportado</p>
                            <span>Apenas vídeos enviados para a plataforma ou links do YouTube e do Vimeo podem ser reproduzidos.</span>
                        </div>
                    )}

                    {book.description && (
                        <p className="media-viewer-description">{book.description}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
