import { Book } from '../types';
import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { uploadApi } from '../services/api';
import { CONTENT_LABELS, getContentType, hasContent } from '../utils/media';
import ContentTypeIcon from './ContentTypeIcon';
import './BookCard.css';

interface BookCardProps {
    book: Book;
    onClick?: () => void;
}

export default function BookCard({ book, onClick }: BookCardProps) {
    const navigate = useNavigate();
    const contentType = getContentType(book);
    const labels = CONTENT_LABELS[contentType];
    const isAvailable = hasContent(book);

    const handleReadBook = () => {
        if (isAvailable) {
            navigate(`/reader/${book.id}`);
        }
    };

    const handleCardClick = () => {
        // Open the viewer if the material has content
        if (isAvailable) {
            navigate(`/reader/${book.id}`);
        }
        // Also call onClick prop if provided
        if (onClick) {
            onClick();
        }
    };

    return (
        <div className="book-card" onClick={handleCardClick}>
            <div className="book-cover">
                <img
                    src={uploadApi.getFileUrl(book.cover_url) || '/placeholder-book.png'}
                    alt={book.title}
                    referrerPolicy="no-referrer"
                />
                <div className="book-overlay">
                    <button
                        className="read-btn"
                        onClick={(e) => { e.stopPropagation(); handleReadBook(); }}
                        disabled={!isAvailable}
                    >
                        <ContentTypeIcon type={contentType} size={20} />
                        <span>{isAvailable ? labels.action : labels.missing}</span>
                    </button>
                </div>
            </div>

            <div className="book-info">
                <h3 className="book-title">{book.title}</h3>
                <p className="book-author">{book.author}</p>

                <div className="book-meta">
                    {contentType !== 'pdf' && (
                        <span className={`book-format book-format-${contentType}`}>
                            <ContentTypeIcon type={contentType} size={12} />
                            {labels.name}
                        </span>
                    )}
                    <span className="book-component">{book.curriculum_component}</span>
                </div>
            </div>

            <div className="book-arrow">
                <ChevronRight size={20} />
            </div>
        </div>
    );
}
