import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import { ArrowLeft, BookOpen, Loader2, Maximize, Minimize, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { booksApi, uploadApi, Book } from '../services/api';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import './BookReader.css';

// Configure PDF.js worker - use CDN to ensure version match
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];
const DEFAULT_ZOOM_INDEX = 2;

// High-DPI rendering: force minimum 3x resolution for crisp quality
// on digital whiteboards, projectors and large screens
const PDF_DEVICE_PIXEL_RATIO = Math.max(window.devicePixelRatio || 1, 3);

export default function BookReader() {
    const { bookId } = useParams<{ bookId: string }>();
    const navigate = useNavigate();
    const [book, setBook] = useState<Book | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [numPages, setNumPages] = useState<number>(0);
    const [currentSpread, setCurrentSpread] = useState(0);
    const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);
    const [isFlipping, setIsFlipping] = useState(false);
    const [flipDirection, setFlipDirection] = useState<'next' | 'prev' | null>(null);
    const [isBookOpen, setIsBookOpen] = useState(false);
    const [loadedPages, setLoadedPages] = useState<Set<number>>(new Set());
    const [availableHeight, setAvailableHeight] = useState<number>(0);
    const contentRef = useRef<HTMLDivElement>(null);

    const currentZoom = ZOOM_LEVELS[zoomIndex];

    // Spread 0 = cover (page 1 only), Spread 1 = pages 2-3, Spread 2 = pages 4-5, etc.
    const isCoverPage = currentSpread === 0;
    const leftPage = isCoverPage ? 1 : (currentSpread - 1) * 2 + 2;
    const rightPage = isCoverPage ? 0 : leftPage + 1;
    // Total spreads: 1 for cover + ceil((numPages - 1) / 2) for the rest
    const totalSpreads = numPages > 0 ? 1 + Math.ceil((numPages - 1) / 2) : 0;

    // Pages to preload (current spread + adjacent spreads)
    const pagesToRender = useMemo(() => {
        const pages = new Set<number>();
        pages.add(leftPage);
        if (rightPage > 0 && rightPage <= numPages) pages.add(rightPage);
        // Previous spread pages
        if (leftPage > 1) pages.add(leftPage - 1);
        if (leftPage > 2) pages.add(leftPage - 2);
        // Next spread pages
        if (leftPage < numPages) pages.add(leftPage + 1);
        if (leftPage + 1 < numPages) pages.add(leftPage + 2);
        return Array.from(pages).filter(p => p >= 1 && p <= numPages);
    }, [leftPage, rightPage, numPages]);

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

    // Trigger book opening animation
    useEffect(() => {
        if (book && !loading) {
            const timer = setTimeout(() => setIsBookOpen(true), 300);
            return () => clearTimeout(timer);
        }
    }, [book, loading]);

    // Measure available content area height
    useEffect(() => {
        const updateHeight = () => {
            if (contentRef.current) {
                // Subtract padding (16px × 2 from spacing-md) and some margin for shadows
                const h = contentRef.current.clientHeight - 40;
                setAvailableHeight(h > 0 ? h : 500);
            }
        };
        updateHeight();
        window.addEventListener('resize', updateHeight);
        return () => window.removeEventListener('resize', updateHeight);
    }, []);

    // Prevent context menu
    useEffect(() => {
        const handleContextMenu = (e: MouseEvent) => e.preventDefault();
        document.addEventListener('contextmenu', handleContextMenu);
        return () => document.removeEventListener('contextmenu', handleContextMenu);
    }, []);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === ' ') {
                e.preventDefault();
                goToNextSpread();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                goToPrevSpread();
            } else if (e.key === 'Home') {
                e.preventDefault();
                setCurrentSpread(0);
            } else if (e.key === 'End') {
                e.preventDefault();
                setCurrentSpread(Math.max(0, totalSpreads - 1));
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [totalSpreads]);

    // Fullscreen listener
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
            // Recalculate available height after fullscreen transition
            setTimeout(() => {
                if (contentRef.current) {
                    const h = contentRef.current.clientHeight - 40;
                    setAvailableHeight(h > 0 ? h : 500);
                }
            }, 100);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
    }, []);

    const onPageLoadSuccess = useCallback((pageNumber: number) => {
        setLoadedPages(prev => new Set(prev).add(pageNumber));
    }, []);

    const goToNextSpread = useCallback(() => {
        if (currentSpread < totalSpreads - 1 && !isFlipping) {
            setIsFlipping(true);
            setFlipDirection('next');
            setTimeout(() => {
                setCurrentSpread(prev => prev + 1);
                setTimeout(() => {
                    setIsFlipping(false);
                    setFlipDirection(null);
                }, 500);
            }, 500);
        }
    }, [currentSpread, totalSpreads, isFlipping]);

    const goToPrevSpread = useCallback(() => {
        if (currentSpread > 0 && !isFlipping) {
            setIsFlipping(true);
            setFlipDirection('prev');
            setTimeout(() => {
                setCurrentSpread(prev => prev - 1);
                setTimeout(() => {
                    setIsFlipping(false);
                    setFlipDirection(null);
                }, 500);
            }, 500);
        }
    }, [currentSpread, isFlipping]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    const handleZoomIn = () => {
        if (zoomIndex < ZOOM_LEVELS.length - 1) {
            setZoomIndex(prev => prev + 1);
        }
    };

    const handleZoomOut = () => {
        if (zoomIndex > 0) {
            setZoomIndex(prev => prev - 1);
        }
    };

    const goBack = () => navigate(-1);

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

    // Check if current pages are loaded
    const currentPagesLoaded = loadedPages.has(leftPage) && (isCoverPage || rightPage > numPages || loadedPages.has(rightPage));

    // Calculate display text for page indicator
    const pageIndicatorText = isCoverPage
        ? `Capa (Página 1) de ${numPages}`
        : rightPage <= numPages
            ? `Páginas ${leftPage} - ${rightPage} de ${numPages}`
            : `Página ${leftPage} de ${numPages}`;

    return (
        <div className={`book-reader ${isFullscreen ? 'fullscreen' : ''}`}>
            {/* Header */}
            <div className="reader-header">
                <button className="btn btn-icon" onClick={goBack} title="Voltar">
                    <ArrowLeft size={20} />
                </button>
                <div className="reader-title">
                    <h1>{book.title}</h1>
                    <span className="reader-author">{book.author}</span>
                </div>
                <div className="reader-controls">
                    <div className="zoom-controls">
                        <button className="btn btn-icon" onClick={handleZoomOut} disabled={zoomIndex === 0}>
                            <ZoomOut size={18} />
                        </button>
                        <span className="zoom-level">{Math.round(currentZoom * 100)}%</span>
                        <button className="btn btn-icon" onClick={handleZoomIn} disabled={zoomIndex === ZOOM_LEVELS.length - 1}>
                            <ZoomIn size={18} />
                        </button>
                    </div>
                    <div className="control-divider" />
                    <button className="btn btn-icon" onClick={toggleFullscreen}>
                        {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                    </button>
                </div>
            </div>

            {/* Book Content */}
            <div className="reader-content" ref={contentRef}>
                <div className={`book-container ${isBookOpen ? 'open' : ''} ${isCoverPage ? 'cover-mode' : ''}`}>
                    {/* Navigation Arrows */}
                    <button
                        className="nav-arrow nav-prev"
                        onClick={goToPrevSpread}
                        disabled={currentSpread === 0 || isFlipping}
                    >
                        <ChevronLeft size={32} />
                    </button>

                    {/* Book Spread */}
                    <div className={`book-spread ${isFlipping ? `flipping-${flipDirection}` : ''} ${isCoverPage ? 'single-page' : ''}`}>
                        <Document
                            file={pdfUrl}
                            onLoadSuccess={onDocumentLoadSuccess}
                            loading={
                                <div className="page-loading">
                                    <Loader2 size={32} className="spin" />
                                </div>
                            }
                            error={
                                <div className="page-error">Erro ao carregar PDF</div>
                            }
                        >
                            {/* Preload all nearby pages (hidden) */}
                            <div className="preload-container">
                                {pagesToRender.map(pageNum => (
                                    <Page
                                        key={`preload-${pageNum}`}
                                        pageNumber={pageNum}
                                        height={availableHeight > 0 ? Math.floor(availableHeight * currentZoom) : undefined}
                                        devicePixelRatio={PDF_DEVICE_PIXEL_RATIO}
                                        renderTextLayer={false}
                                        renderAnnotationLayer={false}
                                        onLoadSuccess={() => onPageLoadSuccess(pageNum)}
                                        className="preload-page"
                                    />
                                ))}
                            </div>

                            {isCoverPage ? (
                                /* Cover Page (single page centered) */
                                <div className="book-page cover-page">
                                    <div className="page-inner">
                                        <Page
                                            pageNumber={1}
                                            height={availableHeight > 0 ? Math.floor(availableHeight * currentZoom) : undefined}
                                            devicePixelRatio={PDF_DEVICE_PIXEL_RATIO}
                                            renderTextLayer={false}
                                            renderAnnotationLayer={false}
                                            loading=""
                                        />
                                    </div>
                                    <div className="cover-shadow" />
                                </div>
                            ) : (
                                /* Two-page spread */
                                <>
                                    {/* Left Page */}
                                    <div className={`book-page left-page ${flipDirection === 'prev' ? 'flip-in' : ''}`}>
                                        <div className="page-inner">
                                            {leftPage <= numPages && (
                                                <Page
                                                    pageNumber={leftPage}
                                                    height={availableHeight > 0 ? Math.floor(availableHeight * currentZoom) : undefined}
                                                    devicePixelRatio={PDF_DEVICE_PIXEL_RATIO}
                                                    renderTextLayer={false}
                                                    renderAnnotationLayer={false}
                                                    loading=""
                                                />
                                            )}
                                        </div>
                                        <div className="page-shadow left-shadow" />
                                    </div>

                                    {/* Center Spine */}
                                    <div className="book-spine" />

                                    {/* Right Page */}
                                    <div className={`book-page right-page ${flipDirection === 'next' ? 'flip-out' : ''}`}>
                                        <div className="page-inner">
                                            {rightPage <= numPages && (
                                                <Page
                                                    pageNumber={rightPage}
                                                    height={availableHeight > 0 ? Math.floor(availableHeight * currentZoom) : undefined}
                                                    devicePixelRatio={PDF_DEVICE_PIXEL_RATIO}
                                                    renderTextLayer={false}
                                                    renderAnnotationLayer={false}
                                                    loading=""
                                                />
                                            )}
                                        </div>
                                        <div className="page-shadow right-shadow" />
                                    </div>
                                </>
                            )}
                        </Document>
                    </div>

                    <button
                        className="nav-arrow nav-next"
                        onClick={goToNextSpread}
                        disabled={currentSpread >= totalSpreads - 1 || isFlipping}
                    >
                        <ChevronRight size={32} />
                    </button>
                </div>

                {/* Loading overlay */}
                {!currentPagesLoaded && numPages > 0 && (
                    <div className="page-loading-overlay">
                        <Loader2 size={32} className="spin" />
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="reader-footer">
                <div className="reader-info">
                    <span className="badge">{book.curriculum_component}</span>
                </div>
                <div className="page-indicator">
                    <span>{pageIndicatorText}</span>
                </div>
                <div className="reader-shortcuts">
                    <span>← → Navegar</span>
                </div>
            </div>
        </div>
    );
}
