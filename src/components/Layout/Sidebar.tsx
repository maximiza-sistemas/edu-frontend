import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
    BookOpen,
    Users,
    Library,
    GraduationCap,
    BookMarked,
    UserCircle,
    Layers
} from 'lucide-react';
import './Sidebar.css';

interface NavItem {
    path: string;
    label: string;
    icon: React.ReactNode;
}

const adminNav: NavItem[] = [
    { path: '/admin/books', label: 'Gerenciar Livros', icon: <BookOpen size={20} /> },
    { path: '/admin/users', label: 'Gerenciar Usuários', icon: <Users size={20} /> },
    { path: '/admin/curriculum', label: 'Componentes Curriculares', icon: <Layers size={20} /> },
    { path: '/admin/series', label: 'Séries', icon: <GraduationCap size={20} /> },
];

const professorNav: NavItem[] = [
    { path: '/professor/my-books', label: 'Meus Livros', icon: <BookMarked size={20} /> },
    { path: '/professor/students', label: 'Meus Alunos', icon: <GraduationCap size={20} /> },
];

const studentNav: NavItem[] = [
    { path: '/student/library', label: 'Minha Biblioteca', icon: <Library size={20} /> },
];

export default function Sidebar() {
    const { user } = useAuth();
    const location = useLocation();

    const getNavItems = (): NavItem[] => {
        switch (user?.role) {
            case 'admin': return adminNav;
            case 'professor': return professorNav;
            case 'student': return studentNav;
            default: return [];
        }
    };

    const getRoleColor = () => {
        switch (user?.role) {
            case 'admin': return 'var(--color-admin)';
            case 'professor': return 'var(--color-professor)';
            case 'student': return 'var(--color-student)';
            default: return 'var(--color-accent-primary)';
        }
    };

    const getRoleLabel = () => {
        switch (user?.role) {
            case 'admin': return 'Administrador';
            case 'professor': return 'Professor';
            case 'student': return 'Aluno';
            default: return '';
        }
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="logo">
                    <img src="/logo-maximiza.png" alt="Maximiza - Soluções Educacionais" className="logo-image" />
                </div>
            </div>

            <div className="sidebar-user">
                <div className="user-avatar">
                    {user?.avatar ? (
                        <img src={user.avatar} alt={user.name} />
                    ) : (
                        <UserCircle size={40} />
                    )}
                </div>
                <div className="user-info">
                    <span className="user-name">{user?.name}</span>
                    <span className="user-role" style={{ color: getRoleColor() }}>
                        {getRoleLabel()}
                    </span>
                </div>
            </div>

            <nav className="sidebar-nav">
                {getNavItems().map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `nav-item ${isActive || location.pathname === item.path ? 'active' : ''}`
                        }
                        end={item.path === '/admin' || item.path === '/professor' || item.path === '/student'}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        <span className="nav-label">{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="sidebar-footer">
                <div className="version-info">
                    <span>MaxiEducação v1.0</span>
                </div>
            </div>
        </aside>
    );
}
