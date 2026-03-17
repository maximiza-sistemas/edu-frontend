import { useState, useEffect } from 'react';
import { BookFilters as BookFiltersType } from '../types';
import { seriesApi, Series } from '../services/api';
import { Search, Filter, X } from 'lucide-react';
import './BookFilters.css';

interface BookFiltersProps {
    onFilterChange: (filters: BookFiltersType) => void;
}

export default function BookFilters({
    onFilterChange
}: BookFiltersProps) {
    const [filters, setFilters] = useState<BookFiltersType>({
        search: '',
        curriculumComponent: 'all',
        seriesId: 'all',
        bookType: 'all'
    });
    const [isExpanded, setIsExpanded] = useState(false);
    const [seriesList, setSeriesList] = useState<Series[]>([]);

    // Load series from API
    useEffect(() => {
        const loadSeries = async () => {
            try {
                const data = await seriesApi.getAll();
                setSeriesList(data);
            } catch (err) {
                console.error('Error loading series:', err);
            }
        };
        loadSeries();
    }, []);

    const handleChange = (key: keyof BookFiltersType, value: string) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        onFilterChange(newFilters);
    };

    const clearFilters = () => {
        const clearedFilters: BookFiltersType = {
            search: '',
            curriculumComponent: 'all',
            seriesId: 'all',
            bookType: 'all'
        };
        setFilters(clearedFilters);
        onFilterChange(clearedFilters);
    };

    const hasActiveFilters =
        filters.search ||
        (filters.curriculumComponent && filters.curriculumComponent !== 'all') ||
        (filters.seriesId && filters.seriesId !== 'all') ||
        (filters.bookType && filters.bookType !== 'all');

    return (
        <div className="book-filters">
            <div className="filters-main">
                <div className="search-filter">
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Buscar por título, autor..."
                        value={filters.search}
                        onChange={(e) => handleChange('search', e.target.value)}
                        className="search-input"
                    />
                </div>

                <button
                    className={`filter-toggle ${isExpanded ? 'active' : ''} ${hasActiveFilters ? 'has-filters' : ''}`}
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <Filter size={18} />
                    Filtros
                    {hasActiveFilters && <span className="filter-badge" />}
                </button>

                {hasActiveFilters && (
                    <button className="clear-filters" onClick={clearFilters}>
                        <X size={16} />
                        Limpar
                    </button>
                )}
            </div>

            {isExpanded && (
                <div className="filters-expanded">
                    <div className="filter-group">
                        <label>Componente Curricular</label>
                        <select
                            value={filters.curriculumComponent}
                            onChange={(e) => handleChange('curriculumComponent', e.target.value)}
                            className="select"
                        >
                            <option value="all">Todos os componentes</option>
                            {/* Curriculum components are shown from the types */}
                            {['Matemática', 'Língua Portuguesa', 'Ciências', 'História', 'Geografia', 'Inglês', 'Artes', 'Educação Física', 'Filosofia', 'Sociologia', 'Pensamento Computacional'].map(comp => (
                                <option key={comp} value={comp}>{comp}</option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Série</label>
                        <select
                            value={filters.seriesId}
                            onChange={(e) => handleChange('seriesId', e.target.value)}
                            className="select"
                        >
                            <option value="all">Todas as séries</option>
                            {seriesList.map(series => (
                                <option key={series.id} value={series.name}>{series.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Perfil</label>
                        <select
                            value={filters.bookType}
                            onChange={(e) => handleChange('bookType', e.target.value)}
                            className="select"
                        >
                            <option value="all">Todos os perfis</option>
                            <option value="professor">Professor</option>
                            <option value="student">Aluno</option>
                        </select>
                    </div>
                </div>
            )}
        </div>
    );
}
