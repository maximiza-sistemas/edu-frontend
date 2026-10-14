import { describe, expect, it } from 'vitest';
import type { Book } from '../services/api';
import { DEFAULT_SECTION, MATERIAL_SECTIONS, booksOfSection } from './materialSections';

const book = (id: string, content_type?: Book['content_type']) => ({ id, content_type } as Book);

describe('booksOfSection', () => {
    const books = [book('a', 'pdf'), book('b', 'video'), book('c', 'pptx'), book('d', undefined)];
    const ids = (slug: string) => booksOfSection(books, MATERIAL_SECTIONS.find(s => s.slug === slug)!).map(b => b.id);

    it('splits materials by type, with legacy rows counted as books', () => {
        expect(ids('livros')).toEqual(['a', 'd']);
        expect(ids('videos')).toEqual(['b']);
        expect(ids('slides')).toEqual(['c']);
    });

    it('opens on the books page by default', () => {
        expect(DEFAULT_SECTION.slug).toBe('livros');
    });
});
