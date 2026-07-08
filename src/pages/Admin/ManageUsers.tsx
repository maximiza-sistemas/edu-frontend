import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Edit2, Trash2, X, Users } from 'lucide-react';
import PageBanner from '../../components/PageBanner';
import { User, UserRole } from '../../types';
import { CLASS_GROUPS } from '../../contexts/BooksContext';
import './ManageUsers.css';

export default function ManageUsers() {
    const { users, addUser, updateUser, deleteUser, getUsersByRole } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [filter, setFilter] = useState<'all' | UserRole>('all');

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'student' as UserRole,
        class_group: ''
    });


    const filteredUsers = users.filter(u => {
        if (filter === 'all') return true;
        return u.role === filter;
    });

    const openModal = (user?: User) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                name: user.name,
                email: user.email,
                password: '',
                role: user.role,
                class_group: user.class_group || ''
            });
        } else {
            setEditingUser(null);
            setFormData({ name: '', email: '', password: '', role: 'student', class_group: '' });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
        setFormData({ name: '', email: '', password: '', role: 'student', class_group: '' });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const userData = {
            name: formData.name,
            email: formData.email,
            role: formData.role,
            ...(formData.password ? { password: formData.password } : {}),
            ...(formData.role === 'student' && formData.class_group ? { class_group: formData.class_group } : {})
        };

        if (editingUser) {
            updateUser(editingUser.id, userData);
        } else {
            addUser(userData);
        }
        closeModal();
    };

    const handleDelete = (userId: string) => {
        if (confirm('Tem certeza que deseja excluir este usuário?')) {
            deleteUser(userId);
        }
    };



    return (
        <div className="manage-users animate-fadeIn">
            <PageBanner
                title="Gerenciar Usuários"
                subtitle="Gerencie todos os usuários do sistema"
                icon={<Users size={28} />}
                actions={
                    <button className="btn" onClick={() => openModal()}>
                        <Plus size={20} />
                        Adicionar Usuário
                    </button>
                }
            />

            <div className="filter-tabs">
                <button
                    className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                    onClick={() => setFilter('all')}
                >
                    Todos ({users.length})
                </button>
                <button
                    className={`filter-tab ${filter === 'admin' ? 'active' : ''}`}
                    onClick={() => setFilter('admin')}
                >
                    Admins ({getUsersByRole('admin').length})
                </button>
                <button
                    className={`filter-tab ${filter === 'professor' ? 'active' : ''}`}
                    onClick={() => setFilter('professor')}
                >
                    Professores ({getUsersByRole('professor').length})
                </button>
                <button
                    className={`filter-tab ${filter === 'student' ? 'active' : ''}`}
                    onClick={() => setFilter('student')}
                >
                    Alunos ({getUsersByRole('student').length})
                </button>
                <button
                    className={`filter-tab ${filter === 'niveis' ? 'active' : ''}`}
                    onClick={() => setFilter('niveis')}
                >
                    Níveis ({getUsersByRole('niveis').length})
                </button>
            </div>

            <div className="users-table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Usuário</th>
                            <th>Email</th>
                            <th>Perfil</th>
                            <th>Turma</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map(user => (
                            <tr key={user.id}>
                                <td>
                                    <div className="user-cell">
                                        <img src={user.avatar} alt={user.name} className="user-avatar" />
                                        <span className="user-name">{user.name}</span>
                                    </div>
                                </td>
                                <td>{user.email}</td>
                                <td>
                                    <span className={`badge badge-${user.role}`}>{user.role}</span>
                                </td>
                                <td>{user.class_group || '-'}</td>
                                <td>
                                    <div className="actions">
                                        <button className="btn btn-icon" onClick={() => openModal(user)} title="Editar">
                                            <Edit2 size={18} />
                                        </button>
                                        <button className="btn btn-icon danger" onClick={() => handleDelete(user.id)} title="Excluir">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add/Edit User Modal */}
            {isModalOpen && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{editingUser ? 'Editar Usuário' : 'Adicionar Usuário'}</h3>
                            <button className="btn btn-icon" onClick={closeModal}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="input-group">
                                    <label>Nome Completo</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        className="input"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Senha {editingUser && '(deixe em branco para manter)'}</label>
                                    <input
                                        type="password"
                                        className="input"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        required={!editingUser}
                                        placeholder={editingUser ? '••••••••' : ''}
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Perfil</label>
                                    <select
                                        className="select"
                                        value={formData.role}
                                        onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
                                    >
                                        <option value="admin">Administrador</option>
                                        <option value="professor">Professor</option>
                                        <option value="student">Aluno</option>
                                        <option value="niveis">Níveis</option>
                                    </select>
                                </div>
                                {formData.role === 'student' && (
                                    <div className="input-group">
                                        <label>Turma</label>
                                        <select
                                            className="select"
                                            value={formData.class_group}
                                            onChange={e => setFormData({ ...formData, class_group: e.target.value })}
                                        >
                                            <option value="">Selecione uma turma</option>
                                            {CLASS_GROUPS.map(group => (
                                                <option key={group} value={group}>{group}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {editingUser ? 'Salvar' : 'Adicionar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
