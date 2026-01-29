import { useAuth } from '../../contexts/AuthContext';
import { LogOut, Bell, Search } from 'lucide-react';
import ThemeToggle from '../ThemeToggle';
import './Header.css';

interface HeaderProps {
    title?: string;
}

export default function Header({ title }: HeaderProps) {
    const { user, logout } = useAuth();

    return (
        <header className="header">
            <div className="header-left">
                {title && <h1 className="header-title">{title}</h1>}
            </div>

            <div className="header-center">
                <div className="search-box">
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Buscar livros, alunos..."
                        className="search-input"
                    />
                </div>
            </div>

            <div className="header-right">
                <ThemeToggle />

                <button className="header-btn notification-btn">
                    <Bell size={20} />
                    <span className="notification-badge">3</span>
                </button>

                <div className="header-user">
                    <span className="header-user-name">{user?.name}</span>
                    <button className="header-btn logout-btn" onClick={logout} title="Sair">
                        <LogOut size={20} />
                    </button>
                </div>
            </div>
        </header>
    );
}

