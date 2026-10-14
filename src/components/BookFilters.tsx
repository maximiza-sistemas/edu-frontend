import { useMemo, useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import type { Book } from '../services/api';
import { CONTENT_TYPES } from '../types';
import { getContentType, hasContent } from '../utils/media';
import { EMPTY_FILTERS, collectOptions, countActiveFilters } from '../utils/bookFilters';
import type { BookFilters as BookFiltersType, FilterOption } from '../utils/bookFilters';
import './BookFilters.css';

export type FilterField = 'curriculumComponent' | 'seriesId' | 'level' | 'bookType' | 'contentType' | 'availability' | 'sort';
type SelectField = Exclude<FilterField, 'sort'>;

interface FieldConfig {
    label: string;
    allLabel: string;
    getValues: (book: Book) => (string | null | undefined)[];
    // Display name of a stored value; defaults to the value itself
    labels?: Record<string, string>;
}

const BOOK_TYPE_LABELS: Record<string, string> = { professor: 'Professor', student: 'Aluno' };
const CONTENT_TYPE_LABELS: Record<string, string> = Object.fromEntries(CONTENT_TYPES.map(t => [t.value, t.label]));
const AVAILABILITY_LABELS: Record<string, string> = { available: 'Com arquivo', missing: 'Sem arquivo' };

const FIELD_CONFIG: Record<SelectField, FieldConfig> = {
    curriculumComponent: {
        label: 'Componente Curricular',
        allLabel: 'Todos os componentes',
        getValues: book => [book.curriculum_component]
    },
    seriesId: {
        label: 'Série',
        allLabel: 'Todas as séries',
        getValues: book => book.class_groups || []
    },
    level: {
        label: 'Nível',
        allLabel: 'Todos os níveis',
        getValues: book => [book.level]
    },
    bookType: {
        label: 'Perfil',
        allLabel: 'Todos os perfis',
        getValues: book => [book.book_type],
        labels: BOOK_TYPE_LABELS
    },
    contentType: {
        label: 'Tipo de arquivo',
        allLabel: 'Todos os tipos',
        getValues: book => [getContentType(book)],
        labels: CONTENT_TYPE_LABELS
    },
    availability: {
        label: 'Arquivo anexado',
        allLabel: 'Todos',
        getValues: book => [hasContent(book) ? 'available' : 'missing'],
        labels: AVAILABILITY_LABELS
    }
};

const SORT_OPTIONS = [
    { value: 'title', label: 'Título (A–Z)' },
    { value: 'recent', label: 'Mais recentes' }
] as const;

export const DEFAULT_FIELDS: FilterField[] = ['curriculumComponent', 'seriesId', 'bookType', 'contentType', 'sort'];

interface BookFiltersProps {
    /** Books the options are built from; only values present in them are offered. */
    books: Book[];
    value: BookFiltersType;
    onChange: (filters: BookFiltersType) => void;
    fields?: FilterField[];
    resultCount?: number;
    searchPlaceholder?: string;
}

export default function BookFilters({
    books,
    value,
    onChange,
    fields = DEFAULT_FIELDS,
    resultCount,
    searchPlaceholder = 'Buscar por título, autor, componente...'
}: BookFiltersProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const selectFields = fields.filter((f): f is SelectField => f !== 'sort');

    const optionsByField = useMemo(() => {
        const result: Partial<Record<SelectField, FilterOption[]>> = {};
        for (const field of Object.keys(FIELD_CONFIG) as SelectField[]) {
            result[field] = collectOptions(books, FIELD_CONFIG[field].getValues);
        }
        return result;
    }, [books]);

    const setField = (key: keyof BookFiltersType, fieldValue: string) => {
        onChange({ ...value, [key]: fieldValue });
    };

    const clearFilters = () => {
        onChange({ ...EMPTY_FILTERS, sort: value.sort ?? EMPTY_FILTERS.sort });
    };

    const activeCount = countActiveFilters(value);
    const hasActiveFilters = activeCount > 0 || !!value.search;

    const labelOf = (field: SelectField, raw: string) => FIELD_CONFIG[field].labels?.[raw] ?? raw;

    const activeChips = selectFields
        .map(field => ({ field, raw: value[field] }))
        .filter((chip): chip is { field: SelectField; raw: string } => !!chip.raw && chip.raw !== 'all');

    return (
        <div className="book-filters">
            <div className="filters-main">
                <div className="search-filter">
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        placeholder={searchPlaceholder}
                        value={value.search ?? ''}
                        onChange={(e) => setField('search', e.target.value)}
                        className="search-input"
                        aria-label="Buscar materiais"
                    />
                </div>

                <button
                    type="button"
                    className={`filter-toggle ${isExpanded ? 'active' : ''} ${activeCount > 0 ? 'has-filters' : ''}`}
                    onClick={() => setIsExpanded(!isExpanded)}
                    aria-expanded={isExpanded}
                >
                    <Filter size={18} />
                    Filtros
                    {activeCount > 0 && <span className="filter-badge">{activeCount}</span>}
                </button>

                {hasActiveFilters && (
                    <button type="button" className="clear-filters" onClick={clearFilters}>
                        <X size={16} />
                        Limpar
                    </button>
                )}

                {resultCount !== undefined && (
                    <span className="filter-result-count">
                        {resultCount === 1 ? '1 material' : `${resultCount} materiais`}
                        {hasActiveFilters && ` de ${books.length}`}
                    </span>
                )}
            </div>

            {isExpanded && (
                <div className="filters-expanded">
                    {selectFields.map(field => {
                        const config = FIELD_CONFIG[field];
                        const options = optionsByField[field] ?? [];
                        const selected = value[field] ?? 'all';
                        // Keep the current choice selectable even if no book carries it anymore
                        const shown = selected !== 'all' && !options.some(o => o.value === selected)
                            ? [...options, { value: selected, count: 0 }]
                            : options;
                        if (shown.length === 0) return null;

                        return (
                            <div className="filter-group" key={field}>
                                <label htmlFor={`filter-${field}`}>{config.label}</label>
                                <select
                                    id={`filter-${field}`}
                                    value={selected}
                                    onChange={(e) => setField(field, e.target.value)}
                                    className="select"
                                >
                                    <option value="all">{config.allLabel}</option>
                                    {shown.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {labelOf(field, option.value)} ({option.count})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        );
                    })}

                    {fields.includes('sort') && (
                        <div className="filter-group">
                            <label htmlFor="filter-sort">Ordenar por</label>
                            <select
                                id="filter-sort"
                                value={value.sort ?? EMPTY_FILTERS.sort}
                                onChange={(e) => setField('sort', e.target.value)}
                                className="select"
                            >
                                {SORT_OPTIONS.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            )}

            {!isExpanded && activeChips.length > 0 && (
                <div className="filter-chips">
                    {activeChips.map(({ field, raw }) => (
                        <button
                            type="button"
                            key={field}
                            className="filter-chip"
                            onClick={() => setField(field, 'all')}
                            aria-label={`Remover filtro ${FIELD_CONFIG[field].label}: ${labelOf(field, raw)}`}
                        >
                            <span className="filter-chip-label">{FIELD_CONFIG[field].label}:</span>
                            {labelOf(field, raw)}
                            <X size={14} />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
