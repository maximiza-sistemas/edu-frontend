// Re-export types from API service for backwards compatibility
export type { User, Book, BookAssignment } from '../services/api';

export type UserRole = 'admin' | 'professor' | 'student';

// Book Types
export type BookType = 'student' | 'professor';
export const BOOK_TYPES: { value: BookType; label: string }[] = [
    { value: 'student', label: 'Livro do Aluno' },
    { value: 'professor', label: 'Livro do Professor' }
];

// Componentes Curriculares
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

// Turmas
export const CLASS_GROUPS = [
    '1º ANO',
    '2º ANO',
    '3º ANO',
    '4º ANO',
    '5º ANO'
] as const;

export type ClassGroup = typeof CLASS_GROUPS[number];

// Filtros
export interface BookFilters {
    search?: string;
    curriculumComponent?: CurriculumComponent | 'all';
    classGroup?: ClassGroup | 'all';
    professorId?: string | 'all';
    studentId?: string | 'all';
}
