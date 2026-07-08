import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
    allowedRoles: UserRole[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
    const { isAuthenticated, user, isLoading } = useAuth();

    // Wait for auth state to be determined before redirecting
    if (isLoading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
            }}>
                <Loader2 size={48} className="spin" style={{ color: '#6366f1' }} />
            </div>
        );
    }

    if (!isAuthenticated || !user) {
        return <Navigate to="/login" replace />;
    }

    if (!allowedRoles.includes(user.role)) {
        // Redirect to user's own dashboard
        const roleRoutes = {
            admin: '/admin',
            professor: '/professor',
            student: '/student',
            niveis: '/niveis'
        };
        return <Navigate to={roleRoutes[user.role]} replace />;
    }

    return <Outlet />;
}
