import { describe, expect, it } from 'vitest';
import type { Book } from '../services/api';
import { EMPTY_FILTERS, applyBookFilters, collectOptions, countActiveFilters, normalizeText } from './bookFilters';

function makeBook(overrides: Partial<Book>): Book {
    return {
        id: overrides.title ?? 'id',
        title: 'Livro',
        author: 'Autor',
        description: '',
        cover_url: '',
        pdf_url: '/uploads/pdfs/a.pdf',
        content_type: 'pdf',
        media_url: null,
        curriculum_component: 'Matemática',
        book_type: 'student',
        class_groups: [],
        level: null,
        ...overrides
    };
}

const books: Book[] = [
    makeBook({ title: 'Álgebra', class_groups: ['1º ANO', '2º ANO'], created_at: '2026-01-01T00:00:00Z' }),
    makeBook({
        title: 'Vídeo de Ciências',
        curriculum_component: 'Ciências',
        content_type: 'video',
        media_url: 'https://youtu.be/dQw4w9WgXcQ',
        pdf_url: null,
        class_groups: ['2º ANO'],
        created_at: '2026-03-01T00:00:00Z'
    }),
    makeBook({
        title: 'Slides de História',
        curriculum_component: 'História',
        content_type: 'pptx',
        media_url: null,
        pdf_url: null,
        book_type: 'professor',
        class_groups: ['10º ANO'],
        created_at: '2026-02-01T00:00:00Z'
    }),
    makeBook({ title: 'Inglês Básico', curriculum_component: 'Inglês', level: 'Nível 1' })
];

const titles = (list: Book[]) => list.map(b => b.title);

describe('applyBookFilters', () => {
    it('returns every book sorted by title when no filter is set', () => {
        expect(titles(applyBookFilters(books, EMPTY_FILTERS))).toEqual([
            'Álgebra',
            'Inglês Básico',
            'Slides de História',
            'Vídeo de Ciências'
        ]);
    });

    it('searches ignoring case and accents, including the component and level', () => {
        expect(titles(applyBookFilters(books, { search: 'ALGEBRA' }))).toEqual(['Álgebra']);
        expect(titles(applyBookFilters(books, { search: 'historia' }))).toEqual(['Slides de História']);
        expect(titles(applyBookFilters(books, { search: 'nivel 1' }))).toEqual(['Inglês Básico']);
    });

    it('filters by series, level, profile and component', () => {
        expect(titles(applyBookFilters(books, { seriesId: '2º ANO' }))).toEqual(['Álgebra', 'Vídeo de Ciências']);
        expect(titles(applyBookFilters(books, { level: 'Nível 1' }))).toEqual(['Inglês Básico']);
        expect(titles(applyBookFilters(books, { bookType: 'professor' }))).toEqual(['Slides de História']);
        expect(titles(applyBookFilters(books, { curriculumComponent: 'Ciências' }))).toEqual(['Vídeo de Ciências']);
    });

    it('combines filters', () => {
        expect(titles(applyBookFilters(books, { seriesId: '2º ANO', bookType: 'student', search: 'video' }))).toEqual(['Vídeo de Ciências']);
    });

    it('sorts by most recent, with undated books last', () => {
        expect(titles(applyBookFilters(books, { sort: 'recent' }))).toEqual([
            'Vídeo de Ciências',
            'Slides de História',
            'Álgebra',
            'Inglês Básico'
        ]);
    });

    it('does not mutate the input array', () => {
        const copy = [...books];
        applyBookFilters(books, { sort: 'recent' });
        expect(books).toEqual(copy);
    });
});

describe('collectOptions', () => {
    it('counts each value once per book and sorts numerically', () => {
        const options = collectOptions(books, book => [...book.class_groups, ...book.class_groups]);
        expect(options).toEqual([
            { value: '1º ANO', count: 1 },
            { value: '2º ANO', count: 2 },
            { value: '10º ANO', count: 1 }
        ]);
    });

    it('skips empty values', () => {
        expect(collectOptions(books, book => [book.level])).toEqual([{ value: 'Nível 1', count: 1 }]);
    });
});

describe('countActiveFilters', () => {
    it('ignores search, sort and "all"', () => {
        expect(countActiveFilters(EMPTY_FILTERS)).toBe(0);
        expect(countActiveFilters({ ...EMPTY_FILTERS, search: 'x', sort: 'recent' })).toBe(0);
        expect(countActiveFilters({ ...EMPTY_FILTERS, level: 'Nível 1', seriesId: '1º ANO' })).toBe(2);
    });
});

describe('normalizeText', () => {
    it('handles null and accents', () => {
        expect(normalizeText(null)).toBe('');
        expect(normalizeText(' Língua Portuguesa ')).toBe('lingua portuguesa');
    });
});
