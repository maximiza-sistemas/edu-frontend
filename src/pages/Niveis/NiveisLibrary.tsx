import { useBooks } from '../../contexts/BooksContext';
import { BookOpen, Library } from 'lucide-react';
import PageBanner from '../../components/PageBanner';
import LibraryBookCard from '../../components/LibraryBookCard';
import BookFilters from '../../components/BookFilters';
import { useState } from 'react';
import { applyBookFilters, EMPTY_FILTERS } from '../../utils/bookFilters';
import type { BookFilters as BookFiltersType } from '../../utils/bookFilters';
import '../Student/MyLibrary.css';

export default function NiveisLibrary() {
    const { levelBooks, isLoading } = useBooks();
    const [filters, setFilters] = useState<BookFiltersType>(EMPTY_FILTERS);

    const filteredBooks = applyBookFilters(levelBooks, filters);

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
                subtitle="Acesse os materiais organizados por nível"
                icon={<Library size={28} />}
            />

            <BookFilters
                books={levelBooks}
                value={filters}
                onChange={setFilters}
                fields={['level', 'curriculumComponent', 'bookType', 'contentType', 'sort']}
                resultCount={filteredBooks.length}
            />

            <div className="library-grid">
                {filteredBooks.map(book => (
                    <LibraryBookCard key={book.id} book={book} showProfile showLevel />
                ))}
            </div>

            {filteredBooks.length === 0 && (
                <div className="empty-state">
                    <BookOpen size={64} />
                    <h3>Nenhum material encontrado</h3>
                    <p>
                        {levelBooks.length === 0
                            ? 'Não há materiais por nível disponíveis ainda.'
                            : 'Nenhum material corresponde aos filtros.'}
                    </p>
                </div>
            )}
        </div>
    );
}
