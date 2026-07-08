import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
    BookOpen,
    Users,
    Library,
    GraduationCap,
    BookMarked,
    UserCircle,
    Layers,
    LogOut,
    ChevronRight
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
    { path: '/admin/levels', label: 'Níveis', icon: <Layers size={20} /> },
];

const professorNav: NavItem[] = [
    { path: '/professor/my-books', label: 'Meus Livros', icon: <BookMarked size={20} /> },
    { path: '/professor/students', label: 'Meus Alunos', icon: <GraduationCap size={20} /> },
];

const studentNav: NavItem[] = [
    { path: '/student/library', label: 'Minha Biblioteca', icon: <Library size={20} /> },
];

const niveisNav: NavItem[] = [
    { path: '/niveis/library', label: 'Biblioteca por Níveis', icon: <Library size={20} /> },
];

export default function Sidebar() {
    const { user, logout } = useAuth();
    const location = useLocation();

    const getNavItems = (): NavItem[] => {
        switch (user?.role) {
            case 'admin': return adminNav;
            case 'professor': return professorNav;
            case 'student': return studentNav;
            case 'niveis': return niveisNav;
            default: return [];
        }
    };

    const getRoleLabel = () => {
        switch (user?.role) {
            case 'admin': return 'ADMIN';
            case 'professor': return 'PROFESSOR';
            case 'student': return 'ALUNO';
            case 'niveis': return 'NÍVEIS';
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
                        <ChevronRight size={16} className="nav-chevron" />
                    </NavLink>
                ))}
            </nav>

            <div className="sidebar-bottom">
                <div className="sidebar-user">
                    <div className="user-avatar">
                        {user?.avatar ? (
                            <img src={user.avatar} alt={user.name} />
                        ) : (
                            <UserCircle size={32} />
                        )}
                    </div>
                    <div className="user-info">
                        <span className="user-name">{user?.name}</span>
                        <span className="user-role">{getRoleLabel()}</span>
                    </div>
                </div>
                <button className="sidebar-logout" onClick={logout}>
                    <LogOut size={18} />
                    <span>Sair</span>
                </button>
            </div>
        </aside>
    );
}
