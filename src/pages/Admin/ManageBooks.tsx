import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBooks } from '../../contexts/BooksContext';
import { Plus, Edit2, Trash2, X, Upload, FileText, Loader2, Check, Eye } from 'lucide-react';
import { Book, BookFilters as BookFiltersType, BOOK_TYPES, BookType } from '../../types';
import BookFilters from '../../components/BookFilters';
import { uploadApi, curriculumApi, seriesApi, CurriculumComponent, Series } from '../../services/api';

// Helper to get absolute image URL
const getImageUrl = (url: string) => {
    if (!url) return 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=600&fit=crop';
    return uploadApi.getFileUrl(url);
};
import './ManageBooks.css';

export default function ManageBooks() {
    const navigate = useNavigate();
    const { addBook, updateBook, deleteBook, filterBooks } = useBooks();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBook, setEditingBook] = useState<Book | null>(null);
    const [filters, setFilters] = useState<BookFiltersType>({});

    const [formData, setFormData] = useState({
        title: '',
        author: '',
        description: '',
        coverUrl: '',
        pdfUrl: '',
        curriculumComponent: '',
        bookType: 'student' as BookType,
        classGroups: [] as ClassGroup[]
    });

    // Curriculum components from API
    const [curriculumComponents, setCurriculumComponents] = useState<CurriculumComponent[]>([]);

    // Series from API
    const [seriesList, setSeriesList] = useState<Series[]>([]);

    useEffect(() => {
        loadCurriculumComponents();
        loadSeries();
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

    // PDF upload state
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Cover upload state
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [isUploadingCover, setIsUploadingCover] = useState(false);
    const [uploadCoverError, setUploadCoverError] = useState<string | null>(null);
    const [uploadCoverSuccess, setUploadCoverSuccess] = useState(false);
    const coverInputRef = useRef<HTMLInputElement>(null);

    const filteredBooks = filterBooks(filters);

    const openModal = (book?: Book) => {
        if (book) {
            setEditingBook(book);
            setFormData({
                title: book.title,
                author: book.author,
                description: book.description,
                coverUrl: book.cover_url || '',
                pdfUrl: book.pdf_url || '',
                curriculumComponent: book.curriculum_component || '',
                bookType: book.book_type || 'student',
                classGroups: book.class_groups as ClassGroup[] || []
            });
            setPdfFile(null);
            setUploadSuccess(!!book.pdf_url);
            setCoverFile(null);
            setUploadCoverSuccess(!!book.cover_url);
        } else {
            setEditingBook(null);
            setFormData({
                title: '',
                author: '',
                description: '',
                coverUrl: '',
                pdfUrl: '',
                curriculumComponent: 'Matemática',
                bookType: 'student',
                classGroups: []
            });
            setPdfFile(null);
            setUploadSuccess(false);
            setCoverFile(null);
            setUploadCoverSuccess(false);
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingBook(null);
        setFormData({
            title: '',
            author: '',
            description: '',
            coverUrl: '',
            pdfUrl: '',
            curriculumComponent: 'Matemática',
            bookType: 'student',
            classGroups: []
        });
        setPdfFile(null);
        setUploadError(null);
        setUploadSuccess(false);
        setCoverFile(null);
        setUploadCoverError(null);
        setUploadCoverSuccess(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const cover_url = formData.coverUrl || `https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=600&fit=crop`;

        const bookData = {
            title: formData.title,
            author: formData.author,
            description: formData.description,
            cover_url,
            pdf_url: formData.pdfUrl || undefined,
            curriculum_component: formData.curriculumComponent,
            book_type: formData.bookType,
            class_groups: formData.classGroups
        };

        try {
            if (editingBook) {
                await updateBook(editingBook.id, bookData);
            } else {
                await addBook(bookData as any);
            }
            closeModal();
        } catch (err) {
            console.error('Error saving book:', err);
        }
    };

    const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                setUploadCoverError('Apenas arquivos de imagem são permitidos');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                setUploadCoverError('A imagem deve ter no máximo 5MB');
                return;
            }
            setCoverFile(file);
            setUploadCoverError(null);
            setUploadCoverSuccess(false);
        }
    };

    const handleCoverUpload = async () => {
        if (!coverFile) return;

        setIsUploadingCover(true);
        setUploadCoverError(null);

        try {
            const result = await uploadApi.uploadImage(coverFile);
            if (result.imageUrl) {
                setFormData(prev => ({ ...prev, coverUrl: result.imageUrl! }));
                setUploadCoverSuccess(true);
                setCoverFile(null);
            }
        } catch (err) {
            setUploadCoverError(err instanceof Error ? err.message : 'Erro ao fazer upload');
        } finally {
            setIsUploadingCover(false);
        }
    };

    const handlePdfSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.type !== 'application/pdf') {
                setUploadError('Apenas arquivos PDF são permitidos');
                return;
            }
            if (file.size > 50 * 1024 * 1024) {
                setUploadError('O arquivo deve ter no máximo 50MB');
                return;
            }
            setPdfFile(file);
            setUploadError(null);
            setUploadSuccess(false);
        }
    };

    const handlePdfUpload = async () => {
        if (!pdfFile) return;

        setIsUploading(true);
        setUploadError(null);

        try {
            // 1. Send the PDF
            const result = await uploadApi.uploadPdf(pdfFile);
            const pdfUrl = result.pdfUrl;

            // 2. Generate thumbnail from the first page
            try {
                const coverUrl = await generateCoverFromPdf(pdfFile);
                if (coverUrl) {
                    setFormData(prev => ({
                        ...prev,
                        pdfUrl: pdfUrl || '',
                        coverUrl: coverUrl
                    }));
                } else {
                    setFormData(prev => ({ ...prev, pdfUrl: pdfUrl || '' }));
                }
            } catch (coverErr) {
                console.error('Error auto-generating cover:', coverErr);
                // Don't fail the whole process if cover fails, just set the PDF
                setFormData(prev => ({ ...prev, pdfUrl: pdfUrl || '' }));
            }

            setUploadSuccess(true);
            setPdfFile(null);
        } catch (err) {
            setUploadError(err instanceof Error ? err.message : 'Erro ao fazer upload');
        } finally {
            setIsUploading(false);
        }
    };

    const generateCoverFromPdf = async (file: File): Promise<string | null> => {
        try {
            // Load PDF.js
            const pdfjsLib = await import('pdfjs-dist');

            // Use local worker file from public directory to avoid CORS and version issues
            pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            // Get first page
            const page = await pdf.getPage(1);

            // Configure viewport (scale 1.5 for better quality)
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');

            if (!context) return null;

            canvas.height = viewport.height;
            canvas.width = viewport.width;

            // Render page to canvas
            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };
            await page.render(renderContext as any).promise;

            // Convert to blob
            const blob = await new Promise<Blob | null>(resolve =>
                canvas.toBlob(resolve, 'image/jpeg', 0.8)
            );

            if (!blob) return null;

            // Upload the generated image
            const result = await uploadApi.uploadImage(blob);
            return result.imageUrl || null;

        } catch (err) {
            console.error('Failed to generate PDF cover:', err);
            return null;
        }
    };

    const handleDelete = (bookId: string) => {
        if (confirm('Tem certeza que deseja excluir este livro?')) {
            deleteBook(bookId);
        }
    };

    const toggleClassGroup = (group: ClassGroup) => {
        if (formData.classGroups.includes(group)) {
            setFormData({
                ...formData,
                classGroups: formData.classGroups.filter(g => g !== group)
            });
        } else {
            setFormData({
                ...formData,
                classGroups: [...formData.classGroups, group]
            });
        }
    };

    return (
        <div className="manage-books animate-fadeIn">
            <div className="page-header">
                <h1>Gerenciar Livros</h1>
                <button className="btn btn-primary" onClick={() => openModal()}>
                    <Plus size={20} />
                    Adicionar Livro
                </button>
            </div>

            <BookFilters onFilterChange={setFilters} />

            <div className="books-grid">
                {filteredBooks.map(book => {
                    const coverUrl = getImageUrl(book.cover_url);
                    const hasValidCover = book.cover_url && !book.cover_url.includes('unsplash');

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
                                            <FileText size={48} />
                                            <span>Sem Capa</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="book-cover-placeholder">
                                        <FileText size={48} />
                                        <span>Sem Capa</span>
                                    </div>
                                )}
                            </div>

                            <div className="book-card-content">
                                <div className="book-card-badges">
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
                                            onClick={() => book.pdf_url && navigate(`/reader/${book.id}`)}
                                            title={book.pdf_url ? 'Visualizar' : 'Sem PDF'}
                                            disabled={!book.pdf_url}
                                        >
                                            <Eye size={18} />
                                        </button>
                                        <button className="btn btn-icon" onClick={() => openModal(book)} title="Editar">
                                            <Edit2 size={18} />
                                        </button>
                                        <button className="btn btn-icon danger" onClick={() => handleDelete(book.id)} title="Excluir">
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
                    <p>Nenhum livro encontrado com os filtros selecionados.</p>
                </div>
            )}

            {/* Add/Edit Book Modal */}
            {isModalOpen && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{editingBook ? 'Editar Livro' : 'Adicionar Livro'}</h3>
                            <button className="btn btn-icon" onClick={closeModal}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-grid">
                                    <div className="input-group">
                                        <label>Título</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={formData.title}
                                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label>Autor</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={formData.author}
                                            onChange={e => setFormData({ ...formData, author: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="input-group">
                                    <label>Descrição</label>
                                    <textarea
                                        className="input textarea"
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        rows={3}
                                        required
                                    />
                                </div>
                                <div className="form-grid">
                                    <div className="input-group">
                                        <label>Componente Curricular</label>
                                        <select
                                            className="select"
                                            value={formData.curriculumComponent}
                                            onChange={e => setFormData({ ...formData, curriculumComponent: e.target.value })}
                                            required
                                        >
                                            {curriculumComponents.map(comp => (
                                                <option key={comp.id} value={comp.name}>{comp.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="input-group">
                                        <label>Tipo de Livro</label>
                                        <select
                                            className="select"
                                            value={formData.bookType}
                                            onChange={e => setFormData({ ...formData, bookType: e.target.value as BookType })}
                                            required
                                        >
                                            {BOOK_TYPES.map(type => (
                                                <option key={type.value} value={type.value}>{type.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="form-grid">
                                    <div className="input-group">
                                        <label>Capa do Livro</label>
                                        <div className="tabs-container mb-2">
                                            <div className="pdf-upload-container">
                                                <input
                                                    ref={coverInputRef}
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleCoverSelect}
                                                    style={{ display: 'none' }}
                                                />

                                                {coverFile ? (
                                                    <div className="pdf-selected">
                                                        <FileText size={20} />
                                                        <span className="pdf-filename">{coverFile.name}</span>
                                                        <span className="pdf-size">({(coverFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                                                        <button
                                                            type="button"
                                                            className="btn btn-primary btn-sm"
                                                            onClick={handleCoverUpload}
                                                            disabled={isUploadingCover}
                                                        >
                                                            {isUploadingCover ? (
                                                                <><Loader2 size={16} className="spin" /> Enviando...</>
                                                            ) : (
                                                                <><Upload size={16} /> Enviar</>
                                                            )}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div
                                                        className="upload-area"
                                                        onClick={() => coverInputRef.current?.click()}
                                                    >
                                                        <Upload size={32} />
                                                        <span>Clique para selecionar uma capa</span>
                                                        <span className="upload-hint">Formatos: JPG, PNG (Max 5MB)</span>
                                                    </div>
                                                )}

                                                {uploadCoverError && (
                                                    <p className="upload-error">{uploadCoverError}</p>
                                                )}
                                                {uploadCoverSuccess && (
                                                    <p className="upload-success">Capa enviada com sucesso!</p>
                                                )}

                                                {formData.coverUrl && !coverFile && (
                                                    <div className="mt-2" style={{ width: '100px', height: '140px', background: '#ccc', borderRadius: '4px', overflow: 'hidden' }}>
                                                        <img src={getImageUrl(formData.coverUrl)} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="input-group">
                                    <label>Turmas</label>
                                    <div className="class-grid">
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
                                <div className="input-group">
                                    <label>Arquivo PDF</label>
                                    <div className="pdf-upload-container">
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".pdf,application/pdf"
                                            onChange={handlePdfSelect}
                                            style={{ display: 'none' }}
                                        />

                                        {formData.pdfUrl && !pdfFile ? (
                                            <div className="pdf-uploaded">
                                                <Check size={20} className="text-success" />
                                                <span>PDF anexado</span>
                                                <button
                                                    type="button"
                                                    className="btn btn-sm"
                                                    onClick={() => setFormData({ ...formData, pdfUrl: '' })}
                                                >
                                                    Remover
                                                </button>
                                            </div>
                                        ) : pdfFile ? (
                                            <div className="pdf-selected">
                                                <FileText size={20} />
                                                <span className="pdf-filename">{pdfFile.name}</span>
                                                <span className="pdf-size">({(pdfFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                                                <button
                                                    type="button"
                                                    className="btn btn-primary btn-sm"
                                                    onClick={handlePdfUpload}
                                                    disabled={isUploading}
                                                >
                                                    {isUploading ? (
                                                        <><Loader2 size={16} className="spin" /> Enviando...</>
                                                    ) : (
                                                        <><Upload size={16} /> Enviar</>
                                                    )}
                                                </button>
                                            </div>
                                        ) : (
                                            <div
                                                className="upload-area"
                                                onClick={() => fileInputRef.current?.click()}
                                            >
                                                <Upload size={32} />
                                                <span>Clique para selecionar um PDF</span>
                                                <span className="upload-hint">Máximo 50MB</span>
                                            </div>
                                        )}

                                        {uploadError && (
                                            <p className="upload-error">{uploadError}</p>
                                        )}
                                        {uploadSuccess && (
                                            <p className="upload-success">PDF enviado com sucesso!</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {editingBook ? 'Salvar' : 'Adicionar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
