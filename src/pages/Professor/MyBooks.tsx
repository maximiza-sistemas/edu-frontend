import { useMemo, useState } from 'react';
import { useBooks } from '../../contexts/BooksContext';
import LibraryBookCard from '../../components/LibraryBookCard';
import BookFilters from '../../components/BookFilters';
import { BookOpen } from 'lucide-react';
import PageBanner from '../../components/PageBanner';
import { applyBookFilters, EMPTY_FILTERS } from '../../utils/bookFilters';
import type { BookFilters as BookFiltersType } from '../../utils/bookFilters';
import '../Student/MyLibrary.css';

export default function ProfessorMyBooks() {
    const { books, isLoading } = useBooks();
    const [filters, setFilters] = useState<BookFiltersType>(EMPTY_FILTERS);

    // Level materials belong to the "Níveis" library, not to the series one
    const seriesBooks = useMemo(() => books.filter(book => !book.level), [books]);
    const filteredBooks = applyBookFilters(seriesBooks, filters);

    return (
        <div className="my-library animate-fadeIn">
            <PageBanner
                title="Biblioteca de Materiais"
                subtitle="Acesse os materiais disponíveis"
                icon={<BookOpen size={28} />}
            />

            <BookFilters
                books={seriesBooks}
                value={filters}
                onChange={setFilters}
                fields={['curriculumComponent', 'seriesId', 'bookType', 'contentType', 'sort']}
                resultCount={filteredBooks.length}
            />

            {isLoading ? (
                <div className="empty-state">
                    <p>Carregando materiais...</p>
                </div>
            ) : filteredBooks.length > 0 ? (
                <div className="library-grid">
                    {filteredBooks.map(book => (
                        <LibraryBookCard key={book.id} book={book} showProfile />
                    ))}
                </div>
            ) : (
                <div className="empty-state">
                    <BookOpen size={64} />
                    <h3>Nenhum material encontrado</h3>
                    <p>
                        {seriesBooks.length === 0
                            ? 'Nenhum material disponível ainda.'
                            : 'Nenhum material corresponde aos filtros selecionados.'}
                    </p>
                </div>
            )}
        </div>
    );
}

