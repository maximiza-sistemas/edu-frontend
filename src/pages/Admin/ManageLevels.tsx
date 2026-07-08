import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Layers, Loader2 } from 'lucide-react';
import PageBanner from '../../components/PageBanner';
import { levelsApi, Level } from '../../services/api';
import './ManageCurriculum.css';

export default function ManageLevels() {
    const [levels, setLevels] = useState<Level[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLevel, setEditingLevel] = useState<Level | null>(null);
    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadLevels();
    }, []);

    const loadLevels = async () => {
        try {
            const data = await levelsApi.getAll();
            setLevels(data);
        } catch (err) {
            console.error('Error loading levels:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const openModal = (item?: Level) => {
        if (item) {
            setEditingLevel(item);
            setName(item.name);
        } else {
            setEditingLevel(null);
            setName('');
        }
        setError(null);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingLevel(null);
        setName('');
        setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('Nome é obrigatório');
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            if (editingLevel) {
                const updated = await levelsApi.update(editingLevel.id, name.trim());
                setLevels(prev => prev.map(s => s.id === updated.id ? updated : s));
            } else {
                const created = await levelsApi.create(name.trim());
                setLevels(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
            }
            closeModal();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao salvar');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (item: Level) => {
        if (!confirm(`Tem certeza que deseja excluir "${item.name}"?`)) return;

        try {
            await levelsApi.delete(item.id);
            setLevels(prev => prev.filter(s => s.id !== item.id));
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Erro ao excluir');
        }
    };

    if (isLoading) {
        return (
            <div className="loading-container">
                <Loader2 size={32} className="spin" />
                <p>Carregando níveis...</p>
            </div>
        );
    }

    return (
        <div className="manage-curriculum animate-fadeIn">
            <PageBanner
                title="Gerenciar Níveis"
                subtitle="Gerencie os níveis disponíveis"
                icon={<Layers size={28} />}
                actions={
                    <button className="btn" onClick={() => openModal()}>
                        <Plus size={20} />
                        Adicionar Nível
                    </button>
                }
            />

            <div className="curriculum-grid">
                {levels.map(item => (
                    <div key={item.id} className="curriculum-card">
                        <div className="curriculum-icon">
                            <Layers size={24} />
                        </div>
                        <div className="curriculum-info">
                            <h3>{item.name}</h3>
                        </div>
                        <div className="curriculum-actions">
                            <button className="btn btn-icon" onClick={() => openModal(item)} title="Editar">
                                <Edit2 size={18} />
                            </button>
                            <button className="btn btn-icon danger" onClick={() => handleDelete(item)} title="Excluir">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}

                {levels.length === 0 && (
                    <div className="empty-state">
                        <Layers size={48} />
                        <p>Nenhum nível cadastrado</p>
                        <button className="btn btn-primary" onClick={() => openModal()}>
                            Adicionar Primeiro Nível
                        </button>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{editingLevel ? 'Editar Nível' : 'Adicionar Nível'}</h3>
                            <button className="btn btn-icon" onClick={closeModal}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="input-group">
                                    <label>Nome do Nível</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        placeholder="Ex: Nível 1, Nível 2, Nível 3..."
                                        autoFocus
                                    />
                                </div>
                                {error && <p className="form-error">{error}</p>}
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                                    {isSaving ? (
                                        <>
                                            <Loader2 size={18} className="spin" />
                                            Salvando...
                                        </>
                                    ) : (
                                        editingLevel ? 'Salvar' : 'Adicionar'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
