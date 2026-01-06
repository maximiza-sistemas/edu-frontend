// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
// Extract root URL (remove /api suffix if present)
const SERVER_URL = API_BASE_URL.replace(/\/api\/?$/, '');



// Token management
function getToken(): string | null {
    return localStorage.getItem('maxi-token');
}

function setToken(token: string): void {
    localStorage.setItem('maxi-token', token);
}

function removeToken(): void {
    localStorage.removeItem('maxi-token');
}

// Helper for making authenticated requests
async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    const token = getToken();
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers,
    });

    // If unauthorized, clear token
    if (response.status === 401) {
        removeToken();
    }

    return response;
}

// Types matching backend
export interface User {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'professor' | 'student';
    avatar?: string;
    professor_id?: string;
    class_group?: string;
    created_at?: string;
    updated_at?: string;
}

export interface Book {
    id: string;
    title: string;
    author: string;
    description: string;
    cover_url: string;
    pdf_url?: string;
    curriculum_component: string;
    book_type: 'student' | 'professor';
    class_groups: string[];
    created_at?: string;
    updated_at?: string;
}

export interface BookAssignment {
    id: string;
    book_id: string;
    user_id: string;
    assigned_at: string;
    progress: number;
    book_title?: string;
    user_name?: string;
}

export interface LoginResponse {
    token: string;
    user: User;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    limit: number;
    offset: number;
}

// ============== Auth API ==============
export const authApi = {
    async login(email: string, password: string): Promise<LoginResponse> {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao fazer login');
        }

        const data = await response.json();
        setToken(data.token);
        return data;
    },

    async logout(): Promise<void> {
        await fetchWithAuth('/auth/logout', { method: 'POST' });
        removeToken();
    },

    async getCurrentUser(): Promise<User> {
        const response = await fetchWithAuth('/auth/me');
        if (!response.ok) {
            throw new Error('Não autenticado');
        }
        return response.json();
    },

    isAuthenticated(): boolean {
        return !!getToken();
    }
};

// ============== Users API ==============
export const usersApi = {
    async getAll(params?: { role?: string; professor_id?: string; class_group?: string }): Promise<PaginatedResponse<User>> {
        const searchParams = new URLSearchParams();
        if (params?.role) searchParams.set('role', params.role);
        if (params?.professor_id) searchParams.set('professor_id', params.professor_id);
        if (params?.class_group) searchParams.set('class_group', params.class_group);

        const response = await fetchWithAuth(`/users?${searchParams}`);
        if (!response.ok) throw new Error('Erro ao buscar usuários');
        return response.json();
    },

    async getById(id: string): Promise<User> {
        const response = await fetchWithAuth(`/users/${id}`);
        if (!response.ok) throw new Error('Usuário não encontrado');
        return response.json();
    },

    async getByRole(role: string): Promise<User[]> {
        const response = await fetchWithAuth(`/users/role/${role}`);
        if (!response.ok) throw new Error('Erro ao buscar usuários');
        return response.json();
    },

    async getStudentsByProfessor(professorId: string): Promise<User[]> {
        const response = await fetchWithAuth(`/users/professor/${professorId}/students`);
        if (!response.ok) throw new Error('Erro ao buscar alunos');
        return response.json();
    },

    async create(user: Omit<User, 'id'> & { password: string }): Promise<User> {
        const response = await fetchWithAuth('/users', {
            method: 'POST',
            body: JSON.stringify(user),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao criar usuário');
        }
        return response.json();
    },

    async update(id: string, data: Partial<User> & { password?: string }): Promise<User> {
        const response = await fetchWithAuth(`/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao atualizar usuário');
        }
        return response.json();
    },

    async delete(id: string): Promise<void> {
        const response = await fetchWithAuth(`/users/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Erro ao deletar usuário');
    }
};

// ============== Books API ==============
export const booksApi = {
    async getAll(params?: {
        search?: string;
        curriculum_component?: string;
        class_group?: string;
        professor_id?: string;
        student_id?: string;
    }): Promise<PaginatedResponse<Book>> {
        const searchParams = new URLSearchParams();
        if (params?.search) searchParams.set('search', params.search);
        if (params?.curriculum_component && params.curriculum_component !== 'all') {
            searchParams.set('curriculum_component', params.curriculum_component);
        }
        if (params?.class_group && params.class_group !== 'all') {
            searchParams.set('class_group', params.class_group);
        }
        if (params?.professor_id && params.professor_id !== 'all') {
            searchParams.set('professor_id', params.professor_id);
        }
        if (params?.student_id && params.student_id !== 'all') {
            searchParams.set('student_id', params.student_id);
        }

        const response = await fetchWithAuth(`/books?${searchParams}`);
        if (!response.ok) throw new Error('Erro ao buscar livros');
        return response.json();
    },

    async getById(id: string): Promise<Book> {
        const response = await fetchWithAuth(`/books/${id}`);
        if (!response.ok) throw new Error('Livro não encontrado');
        return response.json();
    },

    async create(book: Omit<Book, 'id' | 'created_at' | 'updated_at'>): Promise<Book> {
        const response = await fetchWithAuth('/books', {
            method: 'POST',
            body: JSON.stringify(book),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao criar livro');
        }
        return response.json();
    },

    async update(id: string, data: Partial<Book>): Promise<Book> {
        const response = await fetchWithAuth(`/books/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao atualizar livro');
        }
        return response.json();
    },

    async delete(id: string): Promise<void> {
        const response = await fetchWithAuth(`/books/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Erro ao deletar livro');
    },

    async getByStudent(userId: string): Promise<Book[]> {
        const response = await fetchWithAuth(`/books/student/${userId}`);
        if (!response.ok) throw new Error('Erro ao buscar livros do aluno');
        return response.json();
    }
};

// ============== Assignments API ==============
export const assignmentsApi = {
    async getAll(params?: { book_id?: string; user_id?: string }): Promise<PaginatedResponse<BookAssignment>> {
        const searchParams = new URLSearchParams();
        if (params?.book_id) searchParams.set('book_id', params.book_id);
        if (params?.user_id) searchParams.set('user_id', params.user_id);

        const response = await fetchWithAuth(`/assignments?${searchParams}`);
        if (!response.ok) throw new Error('Erro ao buscar atribuições');
        return response.json();
    },

    async getByUser(userId: string): Promise<BookAssignment[]> {
        const response = await fetchWithAuth(`/assignments/user/${userId}`);
        if (!response.ok) throw new Error('Erro ao buscar atribuições');
        return response.json();
    },

    async getByBook(bookId: string): Promise<BookAssignment[]> {
        const response = await fetchWithAuth(`/assignments/book/${bookId}`);
        if (!response.ok) throw new Error('Erro ao buscar atribuições');
        return response.json();
    },

    async assign(bookId: string, userId: string): Promise<BookAssignment> {
        const response = await fetchWithAuth('/assignments', {
            method: 'POST',
            body: JSON.stringify({ book_id: bookId, user_id: userId }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao atribuir livro');
        }
        return response.json();
    },

    async unassign(bookId: string, userId: string): Promise<void> {
        const response = await fetchWithAuth(`/assignments/book/${bookId}/user/${userId}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Erro ao remover atribuição');
    },

    async updateProgress(bookId: string, userId: string, progress: number): Promise<BookAssignment> {
        const response = await fetchWithAuth(`/assignments/book/${bookId}/user/${userId}/progress`, {
            method: 'PUT',
            body: JSON.stringify({ progress }),
        });
        if (!response.ok) throw new Error('Erro ao atualizar progresso');
        return response.json();
    }
};

// ============== Upload API ==============
export interface UploadResponse {
    message: string;
    filename: string;
    originalName: string;
    size: number;
    pdfUrl?: string;
    imageUrl?: string;
}

export const uploadApi = {
    async uploadPdf(file: File): Promise<UploadResponse> {
        const token = getToken();
        const formData = new FormData();
        formData.append('pdf', file);

        const response = await fetch(`${API_BASE_URL}/upload/pdf`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao fazer upload do PDF');
        }

        return response.json();
    },

    async uploadImage(file: Blob | File): Promise<UploadResponse> {
        const token = getToken();
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch(`${API_BASE_URL}/upload/image`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao fazer upload da imagem');
        }

        return response.json();
    },

    getPdfUrl(pdfUrl: string): string {
        // If it's a relative URL, prepend the server base
        if (pdfUrl.startsWith('/uploads')) {
            return `${SERVER_URL}${pdfUrl}`;
        }
        return pdfUrl;
    }
};

// ============== Curriculum Components API ==============
export interface CurriculumComponent {
    id: string;
    name: string;
    created_at: string;
}

export const curriculumApi = {
    async getAll(): Promise<CurriculumComponent[]> {
        const response = await fetchWithAuth('/curriculum-components');
        if (!response.ok) throw new Error('Erro ao buscar componentes curriculares');
        return response.json();
    },

    async create(name: string): Promise<CurriculumComponent> {
        const response = await fetchWithAuth('/curriculum-components', {
            method: 'POST',
            body: JSON.stringify({ name })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao criar componente');
        }
        return response.json();
    },

    async update(id: string, name: string): Promise<CurriculumComponent> {
        const response = await fetchWithAuth(`/curriculum-components/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ name })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao atualizar componente');
        }
        return response.json();
    },

    async delete(id: string): Promise<void> {
        const response = await fetchWithAuth(`/curriculum-components/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao excluir componente');
        }
    }
};

// ============== Series API ==============
export interface Series {
    id: string;
    name: string;
    created_at: string;
}

export const seriesApi = {
    async getAll(): Promise<Series[]> {
        const response = await fetchWithAuth('/series');
        if (!response.ok) throw new Error('Erro ao buscar séries');
        return response.json();
    },

    async create(name: string): Promise<Series> {
        const response = await fetchWithAuth('/series', {
            method: 'POST',
            body: JSON.stringify({ name })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao criar série');
        }
        return response.json();
    },

    async update(id: string, name: string): Promise<Series> {
        const response = await fetchWithAuth(`/series/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ name })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao atualizar série');
        }
        return response.json();
    },

    async delete(id: string): Promise<void> {
        const response = await fetchWithAuth(`/series/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao excluir série');
        }
    }
};

export { setToken, removeToken, getToken };

