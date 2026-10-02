import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Loader2 } from 'lucide-react';
import { booksApi } from '../services/api';
import type { Book, ContentType } from '../services/api';
import { getContentType, hasContent } from '../utils/media';
import ContentTypeIcon from '../components/ContentTypeIcon';
import VideoViewer from '../components/viewers/VideoViewer';
import PresentationViewer from '../components/viewers/PresentationViewer';
import BookReader from './BookReader';
import './BookReader.css';

const MISSING_CONTENT: Record<ContentType, { title: string; message: string }> = {
    pdf: {
        title: 'PDF não disponível',
        message: 'Este livro ainda não possui um arquivo PDF associado.'
    },
    video: {
        title: 'Vídeo não disponível',
        message: 'Este vídeo ainda não possui arquivo ou link associado.'
    },
    pptx: {
        title: 'Apresentação não disponível',
        message: 'Esta apresentação ainda não possui um arquivo associado.'
    }
};

interface ViewerErrorProps {
    icon: ReactNode;
    title: string;
    message: string;
    onBack: () => void;
}

function ViewerError({ icon, title, message, onBack }: ViewerErrorProps) {
    return (
        <div className="book-reader-error">
            {icon}
            <h2>{title}</h2>
            <p>{message}</p>
            <button className="btn btn-primary" onClick={onBack}>
                <ArrowLeft size={20} />
                Voltar
            </button>
        </div>
    );
}

/** Route element for /reader/:bookId: loads the material once and opens the viewer for its format. */
export default function ContentViewer() {
    const { bookId } = useParams<{ bookId: string }>();
    const navigate = useNavigate();
    const [book, setBook] = useState<Book | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isCancelled = false;

        const loadBook = async () => {
            if (!bookId) {
                setError('ID do material não fornecido');
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);
            setBook(null);
            try {
                const bookData = await booksApi.getById(bookId);
                if (!isCancelled) setBook(bookData);
            } catch (err) {
                if (!isCancelled) setError('Erro ao carregar o material');
                console.error(err);
            } finally {
                if (!isCancelled) setLoading(false);
            }
        };

        loadBook();
        return () => {
            isCancelled = true;
        };
    }, [bookId]);

    const goBack = () => navigate(-1);

    if (loading) {
        return (
            <div className="book-reader-loading">
                <Loader2 size={48} className="spin" />
                <p>Carregando material...</p>
            </div>
        );
    }

    if (error || !book) {
        return (
            <ViewerError
                icon={<BookOpen size={48} />}
                title="Erro ao carregar"
                message={error || 'Material não encontrado'}
                onBack={goBack}
            />
        );
    }

    const contentType = getContentType(book);

    if (!hasContent(book)) {
        return (
            <ViewerError
                icon={<ContentTypeIcon type={contentType} size={48} />}
                title={MISSING_CONTENT[contentType].title}
                message={MISSING_CONTENT[contentType].message}
                onBack={goBack}
            />
        );
    }

    // key resets each viewer's internal state when navigating between materials
    if (contentType === 'video') {
        return <VideoViewer key={book.id} book={book} onBack={goBack} />;
    }

    if (contentType === 'pptx') {
        return <PresentationViewer key={book.id} book={book} onBack={goBack} />;
    }

    return <BookReader key={book.id} book={book} />;
}
