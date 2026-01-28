import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const API_BASE = 'http://localhost:3001/api';

interface User {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'coordenador' | 'professor';
}

interface AuthState {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    error: string | null;

    login: (email: string, password: string) => Promise<boolean>;
    logout: () => void;
    checkAuth: () => Promise<boolean>;
    clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isLoading: false,
            error: null,

            login: async (email: string, password: string) => {
                set({ isLoading: true, error: null });

                try {
                    const response = await fetch(`${API_BASE}/auth/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password })
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        set({ error: data.error || 'Erro ao fazer login', isLoading: false });
                        return false;
                    }

                    set({
                        user: data.user,
                        token: data.token,
                        isLoading: false,
                        error: null
                    });

                    return true;
                } catch (error) {
                    set({
                        error: 'Erro de conexão. Verifique se o servidor está rodando.',
                        isLoading: false
                    });
                    return false;
                }
            },

            logout: () => {
                set({ user: null, token: null, error: null });
            },

            checkAuth: async () => {
                const { token } = get();

                if (!token) {
                    return false;
                }

                try {
                    const response = await fetch(`${API_BASE}/auth/me`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (!response.ok) {
                        set({ user: null, token: null });
                        return false;
                    }

                    const data = await response.json();
                    set({ user: data.user });
                    return true;
                } catch (error) {
                    set({ user: null, token: null });
                    return false;
                }
            },

            clearError: () => set({ error: null })
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                user: state.user,
                token: state.token
            })
        }
    )
);

// Helper para pegar o token
export const getAuthToken = () => useAuthStore.getState().token;
