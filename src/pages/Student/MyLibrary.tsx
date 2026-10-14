import { useAuth } from '../../contexts/AuthContext';
import { useBooks } from '../../contexts/BooksContext';
import { BookOpen } from 'lucide-react';
import ContentTypeIcon from '../../components/ContentTypeIcon';
import { booksOfSection } from '../../utils/materialSections';
import type { MaterialSection } from '../../utils/materialSections';
import PageBanner from '../../components/PageBanner';
import LibraryBookCard from '../../components/LibraryBookCard';
import BookFilters from '../../components/BookFilters';
import { useMemo, useState } from 'react';
import { applyBookFilters, EMPTY_FILTERS } from '../../utils/bookFilters';
import type { BookFilters as BookFiltersType } from '../../utils/bookFilters';
import './MyLibrary.css';

export default function StudentLibrary({ section }: { section: MaterialSection }) {
    const { user } = useAuth();
    const { studentBooks, isLoading } = useBooks();
    const [filters, setFilters] = useState<BookFiltersType>(EMPTY_FILTERS);

    const sectionBooks = useMemo(() => booksOfSection(studentBooks, section), [studentBooks, section]);
    const filteredBooks = applyBookFilters(sectionBooks, filters);

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
                title={section.label}
                subtitle={user?.class_group ? `Turma: ${user.class_group}` : 'Acesse seus materiais'}
                icon={<ContentTypeIcon type={section.type} size={28} />}
            />

            <BookFilters
                books={sectionBooks}
                value={filters}
                onChange={setFilters}
                fields={['curriculumComponent', 'sort']}
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
                        {sectionBooks.length === 0
                            ? `Não há ${section.label.toLowerCase()} disponíveis para sua turma ainda.`
                            : 'Nenhum material corresponde aos filtros selecionados.'}
                    </p>
                </div>
            )}
        </div>
    );
}
