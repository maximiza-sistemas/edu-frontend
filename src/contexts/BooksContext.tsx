import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { booksApi, Book } from '../services/api';
import { useAuth } from './AuthContext';

// Re-export types for backwards compatibility
export type { Book } from '../services/api';

// Curriculum components - now loaded dynamically but kept for backwards compatibility
export const CURRICULUM_COMPONENTS = [
    'Matemática',
    'Língua Portuguesa',
    'Ciências',
    'História',
    'Geografia',
    'Inglês',
    'Artes',
    'Educação Física',
    'Filosofia',
    'Sociologia'
] as const;

export type CurriculumComponent = typeof CURRICULUM_COMPONENTS[number];

// Class groups
export const CLASS_GROUPS = [
    '1º ANO',
    '2º ANO',
    '3º ANO',
    '4º ANO',
    '5º ANO'
] as const;

export type ClassGroup = typeof CLASS_GROUPS[number];

export interface BookFilters {
    search?: string;
    curriculumComponent?: CurriculumComponent | 'all';
    classGroup?: ClassGroup | 'all';
}

interface BooksContextType {
    books: Book[];
    studentBooks: Book[];
    isLoading: boolean;
    error: string | null;
    addBook: (book: Omit<Book, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
    updateBook: (id: string, data: Partial<Book>) => Promise<void>;
    deleteBook: (id: string) => Promise<void>;
    getBookById: (id: string) => Book | undefined;
    filterBooks: (filters: BookFilters) => Book[];
    getBooksByComponent: (component: CurriculumComponent) => Book[];
    getBooksByClass: (classGroup: ClassGroup) => Book[];
    refreshBooks: () => Promise<void>;
}

const BooksContext = createContext<BooksContextType | undefined>(undefined);

export function BooksProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [books, setBooks] = useState<Book[]>([]);
    const [studentBooks, setStudentBooks] = useState<Book[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refreshBooks = useCallback(async () => {
        try {
            const response = await booksApi.getAll();
            setBooks(response.data);
        } catch (err) {
            console.error('Failed to load books:', err);
            setError('Erro ao carregar livros');
        }
    }, []);

    const loadStudentBooks = useCallback(async () => {
        if (!user?.id || user.role !== 'student') return;
        try {
            const studentBooksData = await booksApi.getByStudent(user.id);
            setStudentBooks(studentBooksData);
        } catch (err) {
            console.error('Failed to load student books:', err);
        }
    }, [user?.id, user?.role]);

    // Load books when authenticated
    useEffect(() => {
        const loadData = async () => {
            if (user) {
                setIsLoading(true);
                await refreshBooks();
                if (user.role === 'student') {
                    await loadStudentBooks();
                }
                setIsLoading(false);
            } else {
                // No user, reset state
                setBooks([]);
                setStudentBooks([]);
                setIsLoading(false);
            }
        };
        loadData();
    }, [user, refreshBooks, loadStudentBooks]);

    const addBook = async (bookData: Omit<Book, 'id' | 'created_at' | 'updated_at'>) => {
        try {
            const newBook = await booksApi.create(bookData);
            setBooks(prev => [...prev, newBook]);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao criar livro';
            throw new Error(message);
        }
    };

    const updateBook = async (id: string, data: Partial<Book>) => {
        try {
            const updatedBook = await booksApi.update(id, data);
            setBooks(prev => prev.map(b => b.id === id ? updatedBook : b));
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao atualizar livro';
            throw new Error(message);
        }
    };

    const deleteBook = async (id: string) => {
        try {
            await booksApi.delete(id);
            setBooks(prev => prev.filter(b => b.id !== id));
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao deletar livro';
            throw new Error(message);
        }
    };

    const getBookById = (id: string): Book | undefined => {
        return books.find(b => b.id === id);
    };

    const filterBooks = (filters: BookFilters): Book[] => {
        return books.filter(book => {
            // Search filter
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                const matchesSearch =
                    book.title.toLowerCase().includes(searchLower) ||
                    book.author.toLowerCase().includes(searchLower) ||
                    book.description.toLowerCase().includes(searchLower);
                if (!matchesSearch) return false;
            }

            // Curriculum component filter
            if (filters.curriculumComponent && filters.curriculumComponent !== 'all') {
                if (book.curriculum_component !== filters.curriculumComponent) return false;
            }

            // Class group filter
            if (filters.classGroup && filters.classGroup !== 'all') {
                if (!book.class_groups.includes(filters.classGroup)) return false;
            }

            return true;
        });
    };

    const getBooksByComponent = (component: CurriculumComponent): Book[] => {
        return books.filter(b => b.curriculum_component === component);
    };

    const getBooksByClass = (classGroup: ClassGroup): Book[] => {
        return books.filter(b => b.class_groups.includes(classGroup));
    };

    return (
        <BooksContext.Provider value={{
            books,
            studentBooks,
            isLoading,
            error,
            addBook,
            updateBook,
            deleteBook,
            getBookById,
            filterBooks,
            getBooksByComponent,
            getBooksByClass,
            refreshBooks
        }}>
            {children}
        </BooksContext.Provider>
    );
}

export function useBooks() {
    const context = useContext(BooksContext);
    if (context === undefined) {
        throw new Error('useBooks must be used within a BooksProvider');
    }
    return context;
}
