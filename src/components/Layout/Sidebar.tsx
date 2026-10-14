import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
    Users,
    Library,
    GraduationCap,
    UserCircle,
    Layers,
    LogOut,
    ChevronRight,
    ChevronDown
} from 'lucide-react';
import ContentTypeIcon from '../ContentTypeIcon';
import { MATERIAL_SECTIONS } from '../../utils/materialSections';
import './Sidebar.css';

interface NavItem {
    path: string;
    label: string;
    icon: React.ReactNode;
}

interface NavGroup {
    label: string;
    icon: React.ReactNode;
    basePath: string;
    children: NavItem[];
}

type NavEntry = NavItem | NavGroup;

const isGroup = (entry: NavEntry): entry is NavGroup => 'children' in entry;

// "Materiais" menu with one page per material type (Livros, Vídeos, Slides)
const materialsGroup = (basePath: string): NavGroup => ({
    label: 'Materiais',
    icon: <Library size={20} />,
    basePath,
    children: MATERIAL_SECTIONS.map(section => ({
        path: `${basePath}/${section.slug}`,
        label: section.label,
        icon: <ContentTypeIcon type={section.type} size={18} />
    }))
});

const adminNav: NavEntry[] = [
    materialsGroup('/admin/books'),
    { path: '/admin/users', label: 'Gerenciar Usuários', icon: <Users size={20} /> },
    { path: '/admin/curriculum', label: 'Componentes Curriculares', icon: <Layers size={20} /> },
    { path: '/admin/series', label: 'Séries', icon: <GraduationCap size={20} /> },
    { path: '/admin/levels', label: 'Níveis', icon: <Layers size={20} /> },
];

const professorNav: NavEntry[] = [
    materialsGroup('/professor/my-books'),
    { path: '/professor/students', label: 'Meus Alunos', icon: <GraduationCap size={20} /> },
];

const studentNav: NavEntry[] = [
    materialsGroup('/student/library'),
];

const niveisNav: NavEntry[] = [
    materialsGroup('/niveis/library'),
];

function NavLeaf({ item, className = 'nav-item' }: { item: NavItem; className?: string }) {
    return (
        <NavLink to={item.path} className={({ isActive }) => `${className} ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
            {className === 'nav-item' && <ChevronRight size={16} className="nav-chevron" />}
        </NavLink>
    );
}

function NavGroupItem({ group }: { group: NavGroup }) {
    const { pathname } = useLocation();
    const isInside = pathname.startsWith(group.basePath);
    const [isOpen, setIsOpen] = useState(true);

    // Navigating into the group (e.g. right after login) always shows its pages
    useEffect(() => {
        if (isInside) setIsOpen(true);
    }, [isInside]);

    return (
        <div className="nav-group">
            <button
                type="button"
                className={`nav-item nav-group-toggle ${isInside ? 'active-parent' : ''}`}
                onClick={() => setIsOpen(open => !open)}
                aria-expanded={isOpen}
            >
                <span className="nav-icon">{group.icon}</span>
                <span className="nav-label">{group.label}</span>
                <ChevronDown size={16} className={`nav-chevron ${isOpen ? 'open' : ''}`} />
            </button>
            {isOpen && (
                <div className="nav-submenu">
                    {group.children.map(child => (
                        <NavLeaf key={child.path} item={child} className="nav-subitem" />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function Sidebar() {
    const { user, logout } = useAuth();

    const getNavItems = (): NavEntry[] => {
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
                {getNavItems().map(entry => (
                    isGroup(entry)
                        ? <NavGroupItem key={entry.basePath} group={entry} />
                        : <NavLeaf key={entry.path} item={entry} />
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
