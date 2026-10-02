import { useAuth } from '../../contexts/AuthContext';
import { useBooks } from '../../contexts/BooksContext';
import { BookOpen, GraduationCap, Layers, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import BookCard from '../../components/BookCard';
import PageBanner from '../../components/PageBanner';
import '../Admin/Dashboard.css';

export default function StudentDashboard() {
    const { user } = useAuth();
    const { studentBooks, isLoading } = useBooks();

    // Get unique curriculum components from student's books
    const uniqueComponents = new Set(studentBooks.map(b => b.curriculum_component)).size;

    const stats = [
        {
            label: 'Meus Materiais',
            value: studentBooks.length,
            icon: <BookOpen size={24} />,
            color: 'var(--color-student)',
            link: '/student/library'
        },
        {
            label: 'Minha Turma',
            value: user?.class_group || '-',
            icon: <GraduationCap size={24} />,
            color: 'var(--color-success)',
            link: '/student/library'
        },
        {
            label: 'Disciplinas',
            value: uniqueComponents,
            icon: <Layers size={24} />,
            color: 'var(--color-warning)',
            link: '/student/library'
        }
    ];

    return (
        <div className="admin-dashboard animate-fadeIn">
            <PageBanner
                title="Meu Painel de Estudos"
                subtitle="Visão geral dos seus estudos"
                icon={<BarChart3 size={28} />}
            />

            <div className="stats-grid">
                {stats.map((stat, index) => (
                    <Link
                        key={index}
                        to={stat.link}
                        className="stat-card"
                        style={{ '--stat-color': stat.color } as React.CSSProperties}
                    >
                        <div className="stat-icon">{stat.icon}</div>
                        <div className="stat-info">
                            <span className="stat-value">{stat.value}</span>
                            <span className="stat-label">{stat.label}</span>
                        </div>
                    </Link>
                ))}
            </div>

            <div className="dashboard-section" style={{ marginTop: 'var(--spacing-xl)' }}>
                <div className="section-header">
                    <h2>Meus Materiais</h2>
                    <Link to="/student/library" className="section-link">Ver biblioteca</Link>
                </div>
                <div className="books-list">
                    {isLoading ? (
                        <div className="empty-state">
                            <p>Carregando materiais...</p>
                        </div>
                    ) : studentBooks.length > 0 ? (
                        studentBooks.slice(0, 4).map(book => (
                            <BookCard
                                key={book.id}
                                book={book}
                            />
                        ))
                    ) : (
                        <div className="empty-state">
                            <BookOpen size={48} />
                            <p>
                                {user?.class_group
                                    ? 'Nenhum material disponível para sua turma ainda.'
                                    : 'Você não está associado a nenhuma turma. Contate o administrador.'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

