import type { Book } from '../services/api';

export type BookSort = 'title' | 'recent';

export interface BookFilters {
    search?: string;
    curriculumComponent?: string | 'all';
    // Series name, stored in book.class_groups
    seriesId?: string | 'all';
    level?: string | 'all';
    bookType?: Book['book_type'] | 'all';
    sort?: BookSort;
}

export const EMPTY_FILTERS: Required<BookFilters> = {
    search: '',
    curriculumComponent: 'all',
    seriesId: 'all',
    level: 'all',
    bookType: 'all',
    sort: 'title'
};

const SELECT_KEYS = ['curriculumComponent', 'seriesId', 'level', 'bookType'] as const;

/** Lowercase and without accents, so "matematica" finds "Matemática". */
export function normalizeText(value: string | null | undefined): string {
    return (value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function matchesSearch(book: Book, search: string): boolean {
    const term = normalizeText(search);
    if (!term) return true;
    return [book.title, book.author, book.description, book.curriculum_component, book.level]
        .some(field => normalizeText(field).includes(term));
}

export function matchesFilters(book: Book, filters: BookFilters): boolean {
    const isSet = (value: string | undefined) => !!value && value !== 'all';

    if (filters.search && !matchesSearch(book, filters.search)) return false;
    if (isSet(filters.curriculumComponent) && book.curriculum_component !== filters.curriculumComponent) return false;
    if (isSet(filters.seriesId) && !(book.class_groups || []).includes(filters.seriesId!)) return false;
    if (isSet(filters.level) && book.level !== filters.level) return false;
    if (isSet(filters.bookType) && book.book_type !== filters.bookType) return false;
    return true;
}

const byTitle = (a: Book, b: Book) => a.title.localeCompare(b.title, 'pt-BR', { sensitivity: 'base', numeric: true });
// ISO timestamps compare correctly as strings; books without a date go last
const byRecent = (a: Book, b: Book) => (b.created_at ?? '').localeCompare(a.created_at ?? '') || byTitle(a, b);

export function applyBookFilters(books: Book[], filters: BookFilters): Book[] {
    const result = books.filter(book => matchesFilters(book, filters));
    return result.sort(filters.sort === 'recent' ? byRecent : byTitle);
}

/** Number of active filters, not counting the search text or the sort order. */
export function countActiveFilters(filters: BookFilters): number {
    return SELECT_KEYS.filter(key => {
        const value = filters[key];
        return !!value && value !== 'all';
    }).length;
}

export interface FilterOption {
    value: string;
    count: number;
}

/** Distinct values of a field across the books, with how many books carry each one. */
export function collectOptions(books: Book[], getValues: (book: Book) => (string | null | undefined)[]): FilterOption[] {
    const counts = new Map<string, number>();
    for (const book of books) {
        // A book listing the same series twice still counts once
        for (const value of new Set(getValues(book))) {
            if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
        }
    }
    return [...counts.entries()]
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => a.value.localeCompare(b.value, 'pt-BR', { numeric: true }));
}
