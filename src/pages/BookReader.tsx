import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Loader2, Maximize, Minimize, ZoomIn, ZoomOut } from 'lucide-react';
import { booksApi, uploadApi, Book } from '../services/api';
import './BookReader.css';

const ZOOM_LEVELS = [50, 75, 100, 125, 150, 175, 200];
const DEFAULT_ZOOM_INDEX = 2; // 100%

export default function BookReader() {
    const { bookId } = useParams<{ bookId: string }>();
    const navigate = useNavigate();
    const [book, setBook] = useState<Book | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);

    const currentZoom = ZOOM_LEVELS[zoomIndex];

    useEffect(() => {
        const loadBook = async () => {
            if (!bookId) {
                setError('ID do livro não fornecido');
                setLoading(false);
                return;
            }

            try {
                const bookData = await booksApi.getById(bookId);
                setBook(bookData);
            } catch (err) {
                setError('Erro ao carregar o livro');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        loadBook();
    }, [bookId]);

    // Prevent context menu (right-click)
    useEffect(() => {
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
        };
        document.addEventListener('contextmenu', handleContextMenu);
        return () => document.removeEventListener('contextmenu', handleContextMenu);
    }, []);

    // Prevent keyboard shortcuts for download
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Prevent Ctrl+S, Ctrl+P, Ctrl+Shift+S
            if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'p' || e.key === 'S' || e.key === 'P')) {
                e.preventDefault();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const handleZoomIn = () => {
        if (zoomIndex < ZOOM_LEVELS.length - 1) {
            setZoomIndex(zoomIndex + 1);
        }
    };

    const handleZoomOut = () => {
        if (zoomIndex > 0) {
            setZoomIndex(zoomIndex - 1);
        }
    };

    const handleZoomReset = () => {
        setZoomIndex(DEFAULT_ZOOM_INDEX);
    };

    const goBack = () => {
        navigate(-1);
    };

    if (loading) {
        return (
            <div className="book-reader-loading">
                <Loader2 size={48} className="spin" />
                <p>Carregando livro...</p>
            </div>
        );
    }

    if (error || !book) {
        return (
            <div className="book-reader-error">
                <BookOpen size={48} />
                <h2>Erro ao carregar</h2>
                <p>{error || 'Livro não encontrado'}</p>
                <button className="btn btn-primary" onClick={goBack}>
                    <ArrowLeft size={20} />
                    Voltar
                </button>
            </div>
        );
    }

    if (!book.pdf_url) {
        return (
            <div className="book-reader-error">
                <BookOpen size={48} />
                <h2>PDF não disponível</h2>
                <p>Este livro ainda não possui um arquivo PDF associado.</p>
                <button className="btn btn-primary" onClick={goBack}>
                    <ArrowLeft size={20} />
                    Voltar
                </button>
            </div>
        );
    }

    const pdfUrl = uploadApi.getPdfUrl(book.pdf_url);
    // Add parameters to disable download in the PDF viewer
    const embedUrl = `${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`;

    return (
        <div className={`book-reader ${isFullscreen ? 'fullscreen' : ''}`}>
            <div className="reader-header">
                <button className="btn btn-icon" onClick={goBack} title="Voltar">
                    <ArrowLeft size={20} />
                </button>
                <div className="reader-title">
                    <h1>{book.title}</h1>
                    <span className="reader-author">{book.author}</span>
                </div>
                <div className="reader-controls">
                    {/* Zoom Controls */}
                    <div className="zoom-controls">
                        <button
                            className="btn btn-icon"
                            onClick={handleZoomOut}
                            disabled={zoomIndex === 0}
                            title="Diminuir zoom"
                        >
                            <ZoomOut size={20} />
                        </button>
                        <button
                            className="zoom-level-btn"
                            onClick={handleZoomReset}
                            title="Resetar zoom"
                        >
                            {currentZoom}%
                        </button>
                        <button
                            className="btn btn-icon"
                            onClick={handleZoomIn}
                            disabled={zoomIndex === ZOOM_LEVELS.length - 1}
                            title="Aumentar zoom"
                        >
                            <ZoomIn size={20} />
                        </button>
                    </div>
                    <button className="btn btn-icon" onClick={toggleFullscreen} title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}>
                        {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                    </button>
                </div>
            </div>

            <div className="reader-content">
                <div className="pdf-wrapper">
                    <div
                        className="pdf-container"
                        style={{
                            width: `${currentZoom}%`,
                            height: `${currentZoom}%`,
                        }}
                    >
                        {/* Use object tag with PDF viewer settings to disable download */}
                        <object
                            data={embedUrl}
                            type="application/pdf"
                            className="pdf-viewer"
                            onContextMenu={(e) => e.preventDefault()}
                        >
                            {/* Fallback for browsers that don't support object */}
                            <embed
                                src={embedUrl}
                                type="application/pdf"
                                className="pdf-viewer"
                            />
                        </object>
                    </div>
                </div>

                {/* Overlay to prevent drag and some interactions */}
                <div className="pdf-overlay" onContextMenu={(e) => e.preventDefault()} />
            </div>

            <div className="reader-footer">
                <div className="reader-info">
                    <span className="badge">{book.curriculum_component}</span>
                    {book.class_groups?.length > 0 && (
                        <span className="text-muted">{book.class_groups.join(', ')}</span>
                    )}
                </div>
            </div>
        </div>
    );
}
