import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, AlertTriangle, Download, Loader2, Maximize, Minimize, Presentation } from 'lucide-react';
import { uploadApi } from '../../services/api';
import type { Book } from '../../services/api';
import { OFFICE_VIEWER_MAX_MB, getOfficeViewerUrl, isPubliclyReachableUrl } from '../../utils/media';
import '../../pages/BookReader.css';
import './MediaViewer.css';

const BYTES_PER_MB = 1024 * 1024;

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

/**
 * Size of the file in bytes from a HEAD request: undefined while checking, null when unknown.
 * Unknown sizes still go to the online viewer, which then shows its own message if it cannot open them.
 */
function useFileSize(fileUrl: string | null): number | null | undefined {
    const [size, setSize] = useState<{ url: string; bytes: number | null } | null>(null);

    useEffect(() => {
        if (!fileUrl) return undefined;
        const controller = new AbortController();
        fetch(fileUrl, { method: 'HEAD', signal: controller.signal })
            .then(response => {
                const bytes = Number(response.headers.get('Content-Length'));
                setSize({ url: fileUrl, bytes: response.ok && bytes > 0 ? bytes : null });
            })
            .catch(() => {
                if (!controller.signal.aborted) setSize({ url: fileUrl, bytes: null });
            });
        return () => controller.abort();
    }, [fileUrl]);

    return size?.url === fileUrl ? size.bytes : undefined;
}

function DownloadButton({ fileUrl }: { fileUrl: string }) {
    return (
        <a className="btn btn-primary" href={fileUrl} download target="_blank" rel="noopener noreferrer">
            <Download size={18} />
            Baixar apresentação
        </a>
    );
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
    const isPublic = fileUrl !== null && isPubliclyReachableUrl(fileUrl);
    const fileSize = useFileSize(isPublic ? fileUrl : null);
    const isTooBigForViewer = !!fileSize && fileSize > OFFICE_VIEWER_MAX_MB * BYTES_PER_MB;
    const canUseOnlineViewer = isPublic && fileSize !== undefined && !isTooBigForViewer;
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

        if (isPublic && fileSize === undefined) {
            return (
                <div className="media-notice">
                    <Loader2 size={32} className="spin" />
                    <p>Carregando apresentação...</p>
                </div>
            );
        }

        if (isTooBigForViewer) {
            return (
                <div className="media-notice">
                    <Presentation size={40} />
                    <h2>Apresentação grande demais para visualizar online</h2>
                    <p>
                        Esta apresentação tem {(fileSize / BYTES_PER_MB).toFixed(0)} MB, e o visualizador online do
                        Microsoft Office abre arquivos de até {OFFICE_VIEWER_MAX_MB} MB. Baixe o arquivo para abri-lo
                        no PowerPoint ou em outro programa compatível.
                    </p>
                    <DownloadButton fileUrl={fileUrl} />
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
                    <DownloadButton fileUrl={fileUrl} />
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
                    O visualizador online do Microsoft Office abre apresentações de até {OFFICE_VIEWER_MAX_MB} MB.
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
