import { useBooks } from '../../contexts/BooksContext';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Search, FileText, Eye, Library } from 'lucide-react';
import PageBanner from '../../components/PageBanner';
import { useState, useEffect } from 'react';
import { uploadApi, levelsApi, Level } from '../../services/api';
import '../Student/MyLibrary.css';

const getImageUrl = (url: string) => {
    if (!url) return 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=600&fit=crop';
    return uploadApi.getFileUrl(url);
};

export default function NiveisLibrary() {
    const navigate = useNavigate();
    const { levelBooks, isLoading } = useBooks();
    const [search, setSearch] = useState('');
    const [levelFilter, setLevelFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<'all' | 'student' | 'professor'>('all');
    const [levels, setLevels] = useState<Level[]>([]);

    useEffect(() => {
        levelsApi.getAll().then(setLevels).catch(err => console.error('Error loading levels:', err));
    }, []);

    const filteredBooks = levelBooks.filter(book => {
        if (levelFilter !== 'all' && book.level !== levelFilter) return false;
        if (typeFilter !== 'all' && book.book_type !== typeFilter) return false;
        if (search) {
            const s = search.toLowerCase();
            const matches =
                book.title.toLowerCase().includes(s) ||
                book.author.toLowerCase().includes(s) ||
                book.curriculum_component.toLowerCase().includes(s);
            if (!matches) return false;
        }
        return true;
    });

    if (isLoading) {
        return (
            <div className="my-library loading">
                <p>Carregando biblioteca...</p>
            </div>
        );
    }

    return (
        <div className="my-library animate-fadeIn">
            <PageBanner
                title="Biblioteca por Níveis"
                subtitle="Acesse os livros organizados por nível"
                icon={<Library size={28} />}
            />

            <div className="library-search">
                <Search size={18} />
                <input
                    type="text"
                    placeholder="Buscar livros..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="input"
                />
                <select className="select" value={levelFilter} onChange={e => setLevelFilter(e.target.value)}>
                    <option value="all">Todos os níveis</option>
                    {levels.map(lvl => (
                        <option key={lvl.id} value={lvl.name}>{lvl.name}</option>
                    ))}
                </select>
                <select className="select" value={typeFilter} onChange={e => setTypeFilter(e.target.value as 'all' | 'student' | 'professor')}>
                    <option value="all">Todos os tipos</option>
                    <option value="student">Livro do Aluno</option>
                    <option value="professor">Livro do Professor</option>
                </select>
            </div>

            <div className="library-grid">
                {filteredBooks.map(book => {
                    const coverUrl = getImageUrl(book.cover_url);
                    const hasValidCover = book.cover_url && !book.cover_url.includes('unsplash');

                    return (
                        <div
                            key={book.id}
                            className="book-card animate-slideUp"
                            onClick={() => book.pdf_url && navigate(`/reader/${book.id}`)}
                            style={{ cursor: book.pdf_url ? 'pointer' : 'default' }}
                        >
                            <div className="book-card-cover-container">
                                {hasValidCover ? (
                                    <>
                                        <div className="book-card-cover-blur" style={{ backgroundImage: `url(${coverUrl})` }} />
                                        <img
                                            src={coverUrl}
                                            alt={book.title}
                                            className="book-card-cover"
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
                            </div>

                            <div className="book-card-content">
                                <div className="book-card-badges">
                                    <span className={`badge badge-${book.book_type}`}>
                                        {book.book_type === 'professor' ? 'Professor' : 'Aluno'}
                                    </span>
                                    <span className="badge badge-component">{book.curriculum_component}</span>
                                    {book.level && <span className="badge badge-component">{book.level}</span>}
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
                                            if (book.pdf_url) navigate(`/reader/${book.id}`);
                                        }}
                                        disabled={!book.pdf_url}
                                    >
                                        <Eye size={18} />
                                        <span>{book.pdf_url ? 'Ler Agora' : 'Sem PDF'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {filteredBooks.length === 0 && (
                <div className="empty-state">
                    <BookOpen size={64} />
                    <h3>Nenhum livro encontrado</h3>
                    <p>
                        {levelBooks.length === 0
                            ? 'Não há livros por nível disponíveis ainda.'
                            : 'Nenhum livro corresponde aos filtros.'}
                    </p>
                </div>
            )}
        </div>
    );
}
