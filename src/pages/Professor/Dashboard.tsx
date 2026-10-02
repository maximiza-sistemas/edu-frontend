import { useAuth } from '../../contexts/AuthContext';
import { useBooks } from '../../contexts/BooksContext';
import { BookOpen, Users, Layers, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import BookCard from '../../components/BookCard';
import PageBanner from '../../components/PageBanner';
import '../Admin/Dashboard.css';

export default function ProfessorDashboard() {
    const { user, getStudentsByProfessor } = useAuth();
    const { books, isLoading } = useBooks();

    const myStudents = user ? getStudentsByProfessor(user.id) : [];

    // Count unique curriculum components
    const uniqueComponents = new Set(books.map(b => b.curriculum_component)).size;

    const stats = [
        {
            label: 'Total de Materiais',
            value: books.length,
            icon: <BookOpen size={24} />,
            color: 'var(--color-professor)',
            link: '/professor/my-books'
        },
        {
            label: 'Meus Alunos',
            value: myStudents.length,
            icon: <Users size={24} />,
            color: 'var(--color-student)',
            link: '/professor/students'
        },
        {
            label: 'Disciplinas',
            value: uniqueComponents,
            icon: <Layers size={24} />,
            color: 'var(--color-success)',
            link: '/professor/my-books'
        }
    ];

    return (
        <div className="admin-dashboard animate-fadeIn">
            <PageBanner
                title="Meu Painel"
                subtitle="Visão geral das suas atividades"
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

            <div className="dashboard-grid">
                <div className="dashboard-section">
                    <div className="section-header">
                        <h2>Materiais Disponíveis</h2>
                        <Link to="/professor/my-books" className="section-link">Ver todos</Link>
                    </div>
                    <div className="books-list">
                        {isLoading ? (
                            <p className="empty-message">Carregando...</p>
                        ) : books.length > 0 ? (
                            books.slice(0, 3).map(book => (
                                <BookCard
                                    key={book.id}
                                    book={book}
                                />
                            ))
                        ) : (
                            <p className="empty-message">Nenhum material disponível ainda.</p>
                        )}
                    </div>
                </div>

                <div className="dashboard-section">
                    <div className="section-header">
                        <h2>Meus Alunos</h2>
                        <Link to="/professor/students" className="section-link">Ver todos</Link>
                    </div>
                    <div className="recent-list">
                        {myStudents.slice(0, 5).map(student => (
                            <div key={student.id} className="recent-item">
                                <img src={student.avatar} alt={student.name} className="recent-avatar" />
                                <div className="recent-info">
                                    <span className="recent-title">{student.name}</span>
                                    <span className="recent-subtitle">{student.class_group || 'Sem turma'}</span>
                                </div>
                            </div>
                        ))}
                        {myStudents.length === 0 && (
                            <p className="empty-message">Nenhum aluno vinculado.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

