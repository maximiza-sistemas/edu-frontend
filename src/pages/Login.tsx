import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import './Login.css';

export default function Login() {
    const { isAuthenticated, user, login, error, isLoading } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loginError, setLoginError] = useState<string | null>(null);

    if (isLoading) {
        return (
            <div className="login-page">
                <div className="login-loading">
                    <Loader2 size={48} className="spin" />
                    <p>Carregando...</p>
                </div>
            </div>
        );
    }

    if (isAuthenticated && user) {
        const roleRoutes = {
            admin: '/admin/books',
            professor: '/professor/my-books',
            student: '/student/library',
            niveis: '/niveis/library'
        };
        return <Navigate to={roleRoutes[user.role]} replace />;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            setLoginError('Preencha email e senha');
            return;
        }
        setIsSubmitting(true);
        setLoginError(null);
        const success = await login(email, password);
        if (!success) {
            setLoginError(error || 'Email ou senha inválidos');
        }
        setIsSubmitting(false);
    };

    return (
        <div className="login-page">
            <div className="login-background">
                <div className="bg-gradient-1"></div>
                <div className="bg-gradient-2"></div>
                <div className="bg-gradient-3"></div>
                {/* Floating Particles */}
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="floating-particle"
                        style={{
                            left: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 20}s`,
                            animationDuration: `${15 + Math.random() * 20}s`,
                            opacity: 0.3 + Math.random() * 0.5,
                            width: `${2 + Math.random() * 4}px`,
                            height: `${2 + Math.random() * 4}px`,
                        }}
                    />
                ))}
            </div>

            <div className="login-container">
                <div className="login-header">
                    <div className="login-logo">
                        <img src="/logo-maximiza.png" alt="Maximiza - Soluções Educacionais" className="login-logo-image" />
                    </div>
                    <h1>Bem-vindo à Plataforma</h1>
                    <p>Faça login para acessar o sistema</p>
                </div>

                <form className="email-login-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="email">
                            <Mail size={18} />
                            Email
                        </label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="seu.email@maxieducacao.com"
                            autoComplete="email"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">
                            <Lock size={18} />
                            Senha
                        </label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            autoComplete="current-password"
                        />
                    </div>
                    <button
                        type="submit"
                        className="login-btn"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 size={20} className="spin" />
                                <span>Entrando...</span>
                            </>
                        ) : (
                            <>
                                <span>Entrar</span>
                                <ArrowRight size={20} />
                            </>
                        )}
                    </button>
                </form>

                {loginError && (
                    <p className="login-error">{loginError}</p>
                )}
            </div>
        </div>
    );
}
