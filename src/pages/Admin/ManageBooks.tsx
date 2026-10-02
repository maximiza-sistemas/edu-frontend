import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBooks } from '../../contexts/BooksContext';
import { Plus, Edit2, Trash2, X, FileText, Eye, BookOpen, PlayCircle, Presentation, Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import PageBanner from '../../components/PageBanner';
import { Book, BookFilters as BookFiltersType, BookType, CONTENT_TYPES, ContentType } from '../../types';
import BookFilters from '../../components/BookFilters';
import { uploadApi, curriculumApi, seriesApi, levelsApi, CurriculumComponent, Series, Level } from '../../services/api';
import { CONTENT_LABELS, getContentType, hasContent } from '../../utils/media';
import CoverField from '../../components/admin/CoverField';
import MaterialMediaField from '../../components/admin/MaterialMediaField';
import { useMaterialMedia } from '../../components/admin/useMaterialMedia';
import {
    AUDIENCE_OPTIONS,
    EMPTY_FORM,
    buildBookPayload,
    formFromBook,
    getSubmitError
} from '../../components/admin/materialForm';
import type { ClassMode, MaterialForm } from '../../components/admin/materialForm';
import './ManageBooks.css';

// Helper to get absolute image URL
const getImageUrl = (url: string) => {
    if (!url) return 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=600&fit=crop';
    return uploadApi.getFileUrl(url);
};

const CONTENT_ICONS: Record<ContentType, LucideIcon> = {
    pdf: FileText,
    video: PlayCircle,
    pptx: Presentation
};

const getErrorMessage = (err: unknown) => (err instanceof Error && err.message ? err.message : 'Erro ao salvar o material.');

export default function ManageBooks() {
    const navigate = useNavigate();
    const { addBook, updateBook, deleteBook, filterBooks } = useBooks();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBook, setEditingBook] = useState<Book | null>(null);
    const [filters, setFilters] = useState<BookFiltersType>({});

    const [formData, setFormData] = useState<MaterialForm>(EMPTY_FORM);
    const media = useMaterialMedia(formData, setFormData);

    // Save state: the ref blocks a second submit before React re-renders the disabled button
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const isSavingRef = useRef(false);

    // Curriculum components from API
    const [curriculumComponents, setCurriculumComponents] = useState<CurriculumComponent[]>([]);

    // Series from API
    const [seriesList, setSeriesList] = useState<Series[]>([]);

    // Levels from API
    const [levelsList, setLevelsList] = useState<Level[]>([]);

    useEffect(() => {
        loadCurriculumComponents();
        loadSeries();
        loadLevels();
    }, []);

    const loadCurriculumComponents = async () => {
        try {
            const data = await curriculumApi.getAll();
            setCurriculumComponents(data);
            // Set default if not already set
            if (data.length > 0 && !formData.curriculumComponent) {
                setFormData(prev => ({ ...prev, curriculumComponent: data[0].name }));
            }
        } catch (err) {
            console.error('Error loading curriculum components:', err);
        }
    };

    const loadSeries = async () => {
        try {
            const data = await seriesApi.getAll();
            setSeriesList(data);
        } catch (err) {
            console.error('Error loading series:', err);
        }
    };

    const loadLevels = async () => {
        try {
            const data = await levelsApi.getAll();
            setLevelsList(data);
        } catch (err) {
            console.error('Error loading levels:', err);
        }
    };

    const filteredBooks = filterBooks(filters);

    const openModal = (book?: Book) => {
        media.resetAll();
        setEditingBook(book ?? null);
        setFormData(book ? formFromBook(book) : EMPTY_FORM);
        setSaveError(null);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        if (isSavingRef.current) return;
        if (media.isAnyUploading && !window.confirm('Um envio está em andamento e será cancelado. Deseja fechar mesmo assim?')) return;
        media.resetAll();
        setIsModalOpen(false);
        setEditingBook(null);
        setFormData(EMPTY_FORM);
        setSaveError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSavingRef.current || media.isAnyUploading) return;

        const validationError = getSubmitError(formData, media.pendingFiles);
        if (validationError) {
            setSaveError(validationError);
            return;
        }

        isSavingRef.current = true;
        setIsSaving(true);
        setSaveError(null);
        try {
            const payload = buildBookPayload(formData);
            if (editingBook) {
                await updateBook(editingBook.id, payload);
            } else {
                await addBook(payload);
            }
            isSavingRef.current = false;
            closeModal();
        } catch (err) {
            setSaveError(getErrorMessage(err));
        } finally {
            isSavingRef.current = false;
            setIsSaving(false);
        }
    };

    const handleDelete = (bookId: string) => {
        if (confirm('Tem certeza que deseja excluir este material?')) {
            deleteBook(bookId);
        }
    };

    const updateField = <K extends keyof MaterialForm>(field: K, value: MaterialForm[K]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const toggleClassGroup = (group: string) => {
        setFormData(prev => ({
            ...prev,
            classGroups: prev.classGroups.includes(group)
                ? prev.classGroups.filter(g => g !== group)
                : [...prev.classGroups, group]
        }));
    };

    return (
        <div className="manage-books animate-fadeIn">
            <PageBanner
                title="Gerenciar Materiais"
                subtitle="Gerencie livros, vídeos e apresentações da plataforma"
                icon={<BookOpen size={28} />}
                actions={
                    <button className="btn" onClick={() => openModal()}>
                        <Plus size={20} />
                        Adicionar Material
                    </button>
                }
            />

            <BookFilters onFilterChange={setFilters} />

            <div className="books-grid">
                {filteredBooks.map(book => {
                    const coverUrl = getImageUrl(book.cover_url);
                    const hasValidCover = book.cover_url && !book.cover_url.includes('unsplash');
                    const contentType = getContentType(book);
                    const contentLabels = CONTENT_LABELS[contentType];
                    const ContentIcon = CONTENT_ICONS[contentType];
                    const isViewable = hasContent(book);
                    const viewLabel = isViewable ? contentLabels.action : contentLabels.missing;

                    return (
                        <div key={book.id} className="book-card animate-slideUp">
                            <div className="book-card-cover-container">
                                {hasValidCover ? (
                                    <>
                                        {/* Blurred background for diverse aspect ratios */}
                                        <div
                                            className="book-card-cover-blur"
                                            style={{ backgroundImage: `url(${coverUrl})` }}
                                        />
                                        <img
                                            src={coverUrl}
                                            alt={book.title}
                                            className="book-card-cover"
                                            style={{ position: 'relative', zIndex: 1 }}
                                            onError={(e) => {
                                                // Hide broken image and show placeholder
                                                const target = e.target as HTMLImageElement;
                                                target.style.display = 'none';
                                                const placeholder = target.parentElement?.querySelector('.book-cover-placeholder');
                                                if (placeholder) (placeholder as HTMLElement).style.display = 'flex';
                                            }}
                                        />
                                        <div className="book-cover-placeholder" style={{ display: 'none' }}>
                                            <ContentIcon size={48} />
                                            <span>Sem Capa</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="book-cover-placeholder">
                                        <ContentIcon size={48} />
                                        <span>Sem Capa</span>
                                    </div>
                                )}
                            </div>

                            <div className="book-card-content">
                                <div className="book-card-badges">
                                    {contentType !== 'pdf' && (
                                        <span className={`badge badge-format badge-format-${contentType}`}>
                                            <ContentIcon size={12} />
                                            {contentLabels.name}
                                        </span>
                                    )}
                                    <span className={`badge badge-${book.book_type}`}>
                                        {book.book_type === 'professor' ? 'Professor' : 'Aluno'}
                                    </span>
                                    <span className="badge badge-component">{book.curriculum_component}</span>
                                </div>

                                <div>
                                    <h3 className="book-name" title={book.title}>{book.title}</h3>
                                    <span className="book-author">{book.author}</span>
                                </div>

                                <div className="class-tags">
                                    {(book.class_groups || []).slice(0, 3).map((group: string) => (
                                        <span key={group} className="class-tag">{group}</span>
                                    ))}
                                    {(book.class_groups || []).length > 3 && (
                                        <span className="class-tag-more">+{(book.class_groups || []).length - 3}</span>
                                    )}
                                </div>

                                <div className="book-card-footer">
                                    <div className="book-card-actions">
                                        <button
                                            className="btn btn-icon"
                                            onClick={() => isViewable && navigate(`/reader/${book.id}`)}
                                            title={viewLabel}
                                            aria-label={`${viewLabel}: ${book.title}`}
                                            disabled={!isViewable}
                                        >
                                            <Eye size={18} />
                                        </button>
                                        <button
                                            className="btn btn-icon"
                                            onClick={() => openModal(book)}
                                            title="Editar"
                                            aria-label={`Editar ${book.title}`}
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            className="btn btn-icon danger"
                                            onClick={() => handleDelete(book.id)}
                                            title="Excluir"
                                            aria-label={`Excluir ${book.title}`}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {filteredBooks.length === 0 && (
                <div className="text-center text-muted" style={{ padding: '4rem' }}>
                    <FileText size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                    <p>Nenhum material encontrado com os filtros selecionados.</p>
                </div>
            )}

            {/* Add/Edit Material Modal */}
            {isModalOpen && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div
                        className="modal modal-lg"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="material-modal-title"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="modal-header">
                            <h3 id="material-modal-title">{editingBook ? 'Editar Material' : 'Adicionar Material'}</h3>
                            <button type="button" className="btn btn-icon" onClick={closeModal} aria-label="Fechar">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} aria-describedby={saveError ? 'material-form-error' : undefined}>
                            <div className="modal-body">
                                <div className="input-group">
                                    <label htmlFor="material-content-type">Formato do material</label>
                                    <select
                                        id="material-content-type"
                                        className="select"
                                        value={formData.contentType}
                                        onChange={e => media.changeContentType(e.target.value as ContentType)}
                                        disabled={media.isAnyUploading}
                                    >
                                        {CONTENT_TYPES.map(type => (
                                            <option key={type.value} value={type.value}>{type.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-grid">
                                    <div className="input-group">
                                        <label htmlFor="material-title">Título</label>
                                        <input
                                            id="material-title"
                                            type="text"
                                            className="input"
                                            value={formData.title}
                                            onChange={e => updateField('title', e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label htmlFor="material-author">Autor</label>
                                        <input
                                            id="material-author"
                                            type="text"
                                            className="input"
                                            value={formData.author}
                                            onChange={e => updateField('author', e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="input-group">
                                    <label htmlFor="material-description">Descrição</label>
                                    <textarea
                                        id="material-description"
                                        className="input textarea"
                                        value={formData.description}
                                        onChange={e => updateField('description', e.target.value)}
                                        rows={3}
                                        required
                                    />
                                </div>
                                <div className="form-grid">
                                    <div className="input-group">
                                        <label htmlFor="material-component">Componente Curricular</label>
                                        <select
                                            id="material-component"
                                            className="select"
                                            value={formData.curriculumComponent}
                                            onChange={e => updateField('curriculumComponent', e.target.value)}
                                            required
                                        >
                                            {curriculumComponents.map(comp => (
                                                <option key={comp.id} value={comp.name}>{comp.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="input-group">
                                        <label htmlFor="material-audience">Destinado a</label>
                                        <select
                                            id="material-audience"
                                            className="select"
                                            value={formData.bookType}
                                            onChange={e => updateField('bookType', e.target.value as BookType)}
                                            required
                                        >
                                            {AUDIENCE_OPTIONS.map(option => (
                                                <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="form-grid">
                                    <CoverField form={formData} media={media} />
                                </div>
                                <div className="input-group">
                                    <label htmlFor="material-class-mode">Classificação</label>
                                    <select
                                        id="material-class-mode"
                                        className="select"
                                        value={formData.classMode}
                                        onChange={e => updateField('classMode', e.target.value as ClassMode)}
                                    >
                                        <option value="series">Por Ano/Série</option>
                                        <option value="level">Por Nível</option>
                                    </select>
                                </div>

                                {formData.classMode === 'series' ? (
                                    <div className="input-group">
                                        <label id="material-classes-label">Turmas</label>
                                        <div className="class-grid" role="group" aria-labelledby="material-classes-label">
                                            {seriesList.map(series => (
                                                <label key={series.id} className={`class-checkbox ${formData.classGroups.includes(series.name) ? 'checked' : ''}`}>
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.classGroups.includes(series.name)}
                                                        onChange={() => toggleClassGroup(series.name)}
                                                    />
                                                    <span>{series.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="input-group">
                                        <label htmlFor="material-level">Nível</label>
                                        <select
                                            id="material-level"
                                            className="select"
                                            value={formData.level}
                                            onChange={e => updateField('level', e.target.value)}
                                        >
                                            <option value="">Selecione um nível</option>
                                            {levelsList.map(lvl => (
                                                <option key={lvl.id} value={lvl.name}>{lvl.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <MaterialMediaField form={formData} media={media} />
                            </div>
                            <div className="modal-footer">
                                {saveError && (
                                    <p id="material-form-error" className="form-error" role="alert">{saveError}</p>
                                )}
                                <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={isSaving}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={media.isAnyUploading || isSaving}>
                                    {isSaving
                                        ? <><Loader2 size={16} className="spin" aria-hidden="true" /> Salvando...</>
                                        : editingBook ? 'Salvar' : 'Adicionar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
