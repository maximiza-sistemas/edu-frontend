import { useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { uploadApi } from '../services/api';
import type { Book } from '../services/api';
import { CONTENT_LABELS, getContentType, hasContent } from '../utils/media';
import ContentTypeIcon from './ContentTypeIcon';
// Card styles live with the library grid
import '../pages/Student/MyLibrary.css';

interface LibraryBookCardProps {
    book: Book;
    /** Shows the Professor/Aluno badge. */
    showProfile?: boolean;
    /** Shows the level badge when the material has one. */
    showLevel?: boolean;
}

export default function LibraryBookCard({ book, showProfile = false, showLevel = false }: LibraryBookCardProps) {
    const navigate = useNavigate();
    const coverUrl = uploadApi.getFileUrl(book.cover_url);
    const hasValidCover = !!book.cover_url && !book.cover_url.includes('unsplash');
    const contentType = getContentType(book);
    const labels = CONTENT_LABELS[contentType];
    const isAvailable = hasContent(book);
    const openViewer = () => {
        if (isAvailable) navigate(`/reader/${book.id}`);
    };

    return (
        <div
            className="book-card animate-slideUp"
            onClick={openViewer}
            style={{ cursor: isAvailable ? 'pointer' : 'default' }}
        >
            <div className="book-card-cover-container">
                {hasValidCover ? (
                    <>
                        {/* Blurred background for diverse aspect ratios */}
                        <div className="book-card-cover-blur" style={{ backgroundImage: `url(${coverUrl})` }} />
                        <img
                            src={coverUrl}
                            alt={book.title}
                            className="book-card-cover"
                            referrerPolicy="no-referrer"
                            style={{ position: 'relative', zIndex: 1 }}
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const placeholder = target.parentElement?.querySelector('.book-cover-placeholder');
                                if (placeholder) (placeholder as HTMLElement).style.display = 'flex';
                            }}
                        />
                        <div className="book-cover-placeholder" style={{ display: 'none' }}>
                            <FileText size={48} />
                            <span>Sem Capa</span>
                        </div>
                    </>
                ) : (
                    <div className="book-cover-placeholder">
                        <FileText size={48} />
                        <span>Sem Capa</span>
                    </div>
                )}
                {contentType !== 'pdf' && (
                    <span className={`book-card-format book-card-format-${contentType}`}>
                        <ContentTypeIcon type={contentType} size={14} />
                        {labels.name}
                    </span>
                )}
            </div>

            <div className="book-card-content">
                <div className="book-card-badges">
                    {showProfile && (
                        <span className={`badge badge-${book.book_type}`}>
                            {book.book_type === 'professor' ? 'Professor' : 'Aluno'}
                        </span>
                    )}
                    <span className="badge badge-component">{book.curriculum_component}</span>
                    {showLevel && book.level && <span className="badge badge-component">{book.level}</span>}
                </div>

                <div>
                    <h3 className="book-name" title={book.title}>{book.title}</h3>
                    <span className="book-author">{book.author}</span>
                </div>

                <div className="book-card-footer">
                    <button
                        className="btn btn-read"
                        onClick={(e) => {
                            e.stopPropagation();
                            openViewer();
                        }}
                        disabled={!isAvailable}
                    >
                        <ContentTypeIcon type={contentType} size={18} />
                        <span>{isAvailable ? labels.action : labels.missing}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
