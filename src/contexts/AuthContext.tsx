import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { authApi, usersApi, User, removeToken, getToken } from '../services/api';

// Re-export types for backwards compatibility
export type { User } from '../services/api';
import type { UserRole } from '../types';
export type { UserRole };
export type ClassGroup = '1º Ano A' | '1º Ano B' | '2º Ano A' | '2º Ano B' | '3º Ano A' | '3º Ano B' | '4º Ano A' | '4º Ano B' | '5º Ano A' | '5º Ano B';

interface AuthContextType {
    user: User | null;
    users: User[];
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    login: (email: string, password: string) => Promise<boolean>;
    loginAs: (role: UserRole) => void;
    logout: () => void;
    addUser: (user: Omit<User, 'id'> & { password?: string }) => Promise<void>;
    updateUser: (id: string, data: Partial<User>) => Promise<void>;
    deleteUser: (id: string) => Promise<void>;
    getUsersByRole: (role: UserRole) => User[];
    getStudentsByProfessor: (professorId: string) => User[];
    getStudentsByClass: (classGroup: ClassGroup) => User[];
    getUserById: (id: string) => User | undefined;
    refreshUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load current user on mount if token exists
    useEffect(() => {
        const loadUser = async () => {
            const token = getToken();
            if (token) {
                try {
                    const currentUser = await authApi.getCurrentUser();
                    setUser(currentUser);
                    // Store user in localStorage for quick display
                    localStorage.setItem('maxi-current-user', JSON.stringify(currentUser));
                } catch (err) {
                    console.error('Failed to load user:', err);
                    removeToken();
                    localStorage.removeItem('maxi-current-user');
                    setUser(null);
                }
            } else {
                // No token - clear any stale user data
                localStorage.removeItem('maxi-current-user');
                setUser(null);
            }
            setIsLoading(false);
        };
        loadUser();
    }, []);

    // Load all users
    const refreshUsers = useCallback(async () => {
        try {
            const response = await usersApi.getAll();
            setUsers(response.data);
        } catch (err) {
            console.error('Failed to load users:', err);
        }
    }, []);

    // Load users when authenticated
    useEffect(() => {
        if (user) {
            refreshUsers();
        }
    }, [user, refreshUsers]);

    const login = async (email: string, password: string): Promise<boolean> => {
        setError(null);
        try {
            const response = await authApi.login(email, password);
            setUser(response.user);
            localStorage.setItem('maxi-current-user', JSON.stringify(response.user));
            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao fazer login';
            setError(message);
            return false;
        }
    };

    const loginAs = (role: UserRole) => {
        const foundUser = users.find(u => u.role === role);
        if (foundUser) {
            setUser(foundUser);
            localStorage.setItem('maxi-current-user', JSON.stringify(foundUser));
        }
    };

    const logout = () => {
        authApi.logout().catch(console.error);
        setUser(null);
        removeToken();
        localStorage.removeItem('maxi-current-user');
    };

    const addUser = async (userData: Omit<User, 'id'> & { password?: string }) => {
        try {
            const newUser = await usersApi.create({
                ...userData,
                password: userData.password || 'senha123' // Default password
            } as any);
            setUsers(prev => [...prev, newUser]);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao criar usuário';
            throw new Error(message);
        }
    };

    const updateUser = async (id: string, data: Partial<User>) => {
        try {
            const updatedUser = await usersApi.update(id, data);
            setUsers(prev => prev.map(u => u.id === id ? updatedUser : u));
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao atualizar usuário';
            throw new Error(message);
        }
    };

    const deleteUser = async (id: string) => {
        try {
            await usersApi.delete(id);
            setUsers(prev => prev.filter(u => u.id !== id));
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao deletar usuário';
            throw new Error(message);
        }
    };

    const getUsersByRole = (role: UserRole): User[] => {
        return users.filter(u => u.role === role);
    };

    const getStudentsByProfessor = (professorId: string): User[] => {
        return users.filter(u => u.role === 'student' && u.professor_id === professorId);
    };

    const getStudentsByClass = (classGroup: ClassGroup): User[] => {
        return users.filter(u => u.role === 'student' && u.class_group === classGroup);
    };

    const getUserById = (id: string): User | undefined => {
        return users.find(u => u.id === id);
    };

    return (
        <AuthContext.Provider value={{
            user,
            users,
            isAuthenticated: !!user,
            isLoading,
            error,
            login,
            loginAs,
            logout,
            addUser,
            updateUser,
            deleteUser,
            getUsersByRole,
            getStudentsByProfessor,
            getStudentsByClass,
            getUserById,
            refreshUsers
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
