import { useAuth } from '../../contexts/AuthContext';
import { useBooks } from '../../contexts/BooksContext';
import { BookOpen, Library } from 'lucide-react';
import PageBanner from '../../components/PageBanner';
import LibraryBookCard from '../../components/LibraryBookCard';
import BookFilters from '../../components/BookFilters';
import { useState } from 'react';
import { applyBookFilters, EMPTY_FILTERS } from '../../utils/bookFilters';
import type { BookFilters as BookFiltersType } from '../../utils/bookFilters';
import './MyLibrary.css';

export default function StudentLibrary() {
    const { user } = useAuth();
    const { studentBooks, isLoading } = useBooks();
    const [filters, setFilters] = useState<BookFiltersType>(EMPTY_FILTERS);

    const filteredBooks = applyBookFilters(studentBooks, filters);

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
                title="Minha Biblioteca"
                subtitle={user?.class_group ? `Turma: ${user.class_group}` : 'Acesse seus materiais'}
                icon={<Library size={28} />}
            />

            <BookFilters
                books={studentBooks}
                value={filters}
                onChange={setFilters}
                fields={['curriculumComponent', 'contentType', 'sort']}
                resultCount={filteredBooks.length}
            />

            <div className="library-grid">
                {filteredBooks.map(book => (
                    <LibraryBookCard key={book.id} book={book} />
                ))}
            </div>

            {filteredBooks.length === 0 && (
                <div className="empty-state">
                    <BookOpen size={64} />
                    <h3>Nenhum material encontrado</h3>
                    <p>
                        {studentBooks.length === 0
                            ? 'Não há materiais disponíveis para sua turma ainda.'
                            : 'Nenhum material corresponde aos filtros selecionados.'}
                    </p>
                </div>
            )}
        </div>
    );
}
