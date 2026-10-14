import type { Book, ContentType } from '../services/api';
import { getContentType } from './media';

/** A menu page listing a single kind of material. */
export interface MaterialSection {
    slug: string;
    type: ContentType;
    label: string;
    singular: string;
}

export const MATERIAL_SECTIONS: MaterialSection[] = [
    { slug: 'livros', type: 'pdf', label: 'Livros', singular: 'Livro' },
    { slug: 'videos', type: 'video', label: 'Vídeos', singular: 'Vídeo' },
    { slug: 'slides', type: 'pptx', label: 'Slides', singular: 'Slide' }
];

export const DEFAULT_SECTION = MATERIAL_SECTIONS[0];

export function booksOfSection(books: Book[], section: MaterialSection): Book[] {
    return books.filter(book => getContentType(book) === section.type);
}
