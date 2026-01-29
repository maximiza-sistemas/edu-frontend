import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import './ThemeToggle.css';

export default function ThemeToggle() {
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        // Check localStorage first
        const saved = localStorage.getItem('theme');
        if (saved === 'light' || saved === 'dark') return saved;
        // Then check system preference
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
        return 'light';
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    return (
        <button
            className="theme-toggle"
            onClick={toggleTheme}
            title={theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
            aria-label={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
        >
            <span className="theme-toggle-icon">
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </span>
        </button>
    );
}
