import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, AlertTriangle, Download, Loader2, Maximize, Minimize, Presentation } from 'lucide-react';
import { uploadApi } from '../../services/api';
import type { Book } from '../../services/api';
import { MAX_PRESENTATION_SIZE_MB, getOfficeViewerUrl, isPubliclyReachableUrl } from '../../utils/media';
import '../../pages/BookReader.css';
import './MediaViewer.css';

interface PresentationViewerProps {
    book: Book;
    onBack: () => void;
}

/** Absolute http(s) URL of the presentation file, or null when the stored value is unusable. */
function resolveFileUrl(mediaUrl: string | null | undefined): string | null {
    if (!mediaUrl) return null;
    try {
        const url = new URL(uploadApi.getFileUrl(mediaUrl), window.location.href);
        return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
    } catch {
        return null;
    }
}

export default function PresentationViewer({ book, onBack }: PresentationViewerProps) {
    const viewerRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isFrameLoaded, setIsFrameLoaded] = useState(false);

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const fileUrl = resolveFileUrl(book.media_url);
    const canUseOnlineViewer = fileUrl !== null && isPubliclyReachableUrl(fileUrl);
    const canToggleFullscreen = canUseOnlineViewer && document.fullscreenEnabled;

    const toggleFullscreen = () => {
        const request = document.fullscreenElement
            ? document.exitFullscreen()
            : viewerRef.current?.requestFullscreen();
        request?.catch(err => console.error('Erro ao alternar tela cheia:', err));
    };

    const renderBody = () => {
        if (!fileUrl) {
            return (
                <div className="media-notice" role="alert">
                    <AlertTriangle size={40} />
                    <h2>Arquivo inválido</h2>
                    <p>O endereço do arquivo desta apresentação não é válido.</p>
                </div>
            );
        }

        if (!canUseOnlineViewer) {
            return (
                <div className="media-notice">
                    <Presentation size={40} />
                    <h2>Visualização online indisponível</h2>
                    <p>
                        O visualizador de apresentações do Microsoft Office só funciona quando a plataforma
                        está publicada na internet. Neste ambiente, baixe o arquivo para abri-lo no PowerPoint
                        ou em outro programa compatível.
                    </p>
                    <a
                        className="btn btn-primary"
                        href={fileUrl}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <Download size={18} />
                        Baixar apresentação
                    </a>
                </div>
            );
        }

        return (
            <div className="presentation-stage">
                <div className="presentation-frame">
                    {!isFrameLoaded && (
                        <div className="presentation-frame-loading">
                            <Loader2 size={32} className="spin" />
                            <span>Carregando apresentação...</span>
                        </div>
                    )}
                    <iframe
                        src={getOfficeViewerUrl(fileUrl)}
                        title={`Apresentação: ${book.title}`}
                        allowFullScreen
                        onLoad={() => setIsFrameLoaded(true)}
                    />
                </div>
                <p className="presentation-hint">
                    O visualizador online do Microsoft Office abre apresentações de até {MAX_PRESENTATION_SIZE_MB} MB.
                </p>
            </div>
        );
    };

    return (
        <div className="media-viewer" ref={viewerRef}>
            <div className="reader-header">
                <button className="btn btn-icon" onClick={onBack} title="Voltar">
                    <ArrowLeft size={20} />
                </button>
                <div className="reader-title">
                    <h1>{book.title}</h1>
                    <span className="reader-author">{book.author}</span>
                </div>
                {canToggleFullscreen && (
                    <div className="reader-controls">
                        <button
                            className="btn btn-icon"
                            onClick={toggleFullscreen}
                            title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
                        >
                            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                        </button>
                    </div>
                )}
            </div>

            <div className="media-viewer-content media-viewer-content-fill">
                {renderBody()}
            </div>
        </div>
    );
}
