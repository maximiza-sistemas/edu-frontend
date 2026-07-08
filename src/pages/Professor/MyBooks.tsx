import { useBooks } from '../../contexts/BooksContext';
import BookCard from '../../components/BookCard';
import { BookOpen, Search } from 'lucide-react';
import PageBanner from '../../components/PageBanner';
import { useState } from 'react';
import { CURRICULUM_COMPONENTS, CLASS_GROUPS } from '../../contexts/BooksContext';
import './MyBooks.css';

export default function ProfessorMyBooks() {
    const { books, isLoading, filterBooks } = useBooks();
    const [search, setSearch] = useState('');
    const [filterComponent, setFilterComponent] = useState<string>('all');
    const [filterClass, setFilterClass] = useState<string>('all');

    const filteredBooks = filterBooks({
        search,
        curriculumComponent: filterComponent as any,
        classGroup: filterClass as any
    }).filter(book => !book.level);

    return (
        <div className="my-books animate-fadeIn">
            <PageBanner
                title="Biblioteca de Livros"
                subtitle="Acesse os livros disponíveis"
                icon={<BookOpen size={28} />}
            />

            <div className="books-filters">
                <div className="search-input">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Buscar livros..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="input"
                    />
                </div>
                <select
                    className="select"
                    value={filterComponent}
                    onChange={e => setFilterComponent(e.target.value)}
                >
                    <option value="all">Todas as disciplinas</option>
                    {CURRICULUM_COMPONENTS.map(comp => (
                        <option key={comp} value={comp}>{comp}</option>
                    ))}
                </select>
                <select
                    className="select"
                    value={filterClass}
                    onChange={e => setFilterClass(e.target.value)}
                >
                    <option value="all">Todas as turmas</option>
                    {CLASS_GROUPS.map(group => (
                        <option key={group} value={group}>{group}</option>
                    ))}
                </select>
            </div>

            <section className="books-section">
                <div className="books-list">
                    {isLoading ? (
                        <div className="empty-state">
                            <p>Carregando livros...</p>
                        </div>
                    ) : filteredBooks.length > 0 ? (
                        filteredBooks.map(book => (
                            <BookCard
                                key={book.id}
                                book={book}
                            />
                        ))
                    ) : (
                        <div className="empty-state">
                            <BookOpen size={48} />
                            <p>
                                {books.length === 0
                                    ? 'Nenhum livro disponível ainda.'
                                    : 'Nenhum livro corresponde aos filtros selecionados.'}
                            </p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

