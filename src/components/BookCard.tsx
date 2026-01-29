import { Book } from '../types';
import { BookOpen, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { uploadApi } from '../services/api';
import './BookCard.css';

interface BookCardProps {
    book: Book;
    onClick?: () => void;
}

export default function BookCard({ book, onClick }: BookCardProps) {
    const navigate = useNavigate();

    const handleReadBook = () => {
        if (book.pdf_url) {
            navigate(`/reader/${book.id}`);
        }
    };

    const handleCardClick = () => {
        // Navigate to reader if book has PDF
        if (book.pdf_url) {
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
                <img src={uploadApi.getFileUrl(book.cover_url) || '/placeholder-book.png'} alt={book.title} />
                <div className="book-overlay">
                    <button
                        className="read-btn"
                        onClick={(e) => { e.stopPropagation(); handleReadBook(); }}
                        disabled={!book.pdf_url}
                    >
                        <BookOpen size={20} />
                        <span>{book.pdf_url ? 'Ler Agora' : 'Sem PDF'}</span>
                    </button>
                </div>
            </div>

            <div className="book-info">
                <h3 className="book-title">{book.title}</h3>
                <p className="book-author">{book.author}</p>

                <div className="book-meta">
                    <span className="book-component">{book.curriculum_component}</span>
                </div>
            </div>

            <div className="book-arrow">
                <ChevronRight size={20} />
            </div>
        </div>
    );
}
