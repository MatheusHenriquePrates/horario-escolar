/**
 * API Service - Centraliza todas as chamadas HTTP para o backend
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Helper para obter token de autenticação
const getAuthToken = (): string | null => {
    try {
        const authData = localStorage.getItem('auth-storage');
        if (authData) {
            const parsed = JSON.parse(authData);
            return parsed.state?.token || null;
        }
    } catch {
        return null;
    }
    return null;
};

// Helper para criar headers com autenticação
const getAuthHeaders = (): HeadersInit => {
    const token = getAuthToken();
    const headers: HeadersInit = {
        'Content-Type': 'application/json'
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
};

// Fetch autenticado
const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const token = getAuthToken();
    const headers: HeadersInit = {
        ...options.headers
    };

    if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { ...options, headers });

    // Se 401, redireciona para login
    if (response.status === 401) {
        localStorage.removeItem('auth-storage');
        window.location.reload();
    }

    return response;
};

// ==================== TEACHERS ====================

export interface TeacherAllocation {
    subject: string;
    lessonsPerWeek: number;
    classes: string[];
}

export interface TeacherFromAPI {
    id: string;
    name: string;
    workloadMonthly: number;
    color: string;
    allocations: TeacherAllocation[];
}

export interface CreateTeacherPayload {
    nome: string;
    cargaHoraria: number;
    color?: string;
    disciplinas: {
        nome: string;
        aulasPorSemana: number;
        turmas: string[];
    }[];
}

export const teacherAPI = {
    async getAll(): Promise<TeacherFromAPI[]> {
        const res = await authFetch(`${API_BASE}/teachers`);
        if (!res.ok) throw new Error('Erro ao buscar professores');
        return res.json();
    },

    async create(data: CreateTeacherPayload): Promise<TeacherFromAPI> {
        const res = await authFetch(`${API_BASE}/teachers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
            throw new Error(error.error || 'Erro ao criar professor');
        }
        return res.json();
    },

    async update(id: string, data: CreateTeacherPayload): Promise<TeacherFromAPI> {
        const res = await authFetch(`${API_BASE}/teachers/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Erro ao atualizar professor');
        return res.json();
    },

    async delete(id: string): Promise<void> {
        const res = await authFetch(`${API_BASE}/teachers/${id}`, {
            method: 'DELETE'
        });
        if (!res.ok) throw new Error('Erro ao deletar professor');
    }
};

// ==================== SCHEDULE ====================

export interface ScheduleLesson {
    teacherId: string;
    subject: string;
    classId: string;
    day: number;
    timeSlot: number;
    locked?: boolean;
}

export type ScheduleGrid = {
    [day: number]: {
        [slot: number]: {
            [classId: string]: ScheduleLesson;
        };
    };
};

export interface GenerateScheduleResponse {
    message: string;
    scheduleId?: string;
    warnings?: string[];
    details?: string;
}

export const scheduleAPI = {
    async generate(professorIds?: string[]): Promise<GenerateScheduleResponse> {
        const res = await authFetch(`${API_BASE}/grade/gerar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ professores: professorIds || [] })
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.details || data.message || 'Erro ao gerar horários');
        }
        return data;
    },

    async get(): Promise<ScheduleGrid> {
        const res = await authFetch(`${API_BASE}/grade`);
        if (!res.ok) throw new Error('Erro ao buscar grade');
        return res.json();
    },

    async getByClass(turma: string): Promise<ScheduleGrid> {
        const res = await authFetch(`${API_BASE}/grade/turma/${turma}`);
        if (!res.ok) throw new Error('Erro ao buscar grade da turma');
        return res.json();
    },

    async getByTeacher(teacherId: string): Promise<ScheduleGrid> {
        const res = await authFetch(`${API_BASE}/grade/professor/${teacherId}`);
        if (!res.ok) throw new Error('Erro ao buscar grade do professor');
        return res.json();
    }
};

// ==================== PDF ====================

export const pdfAPI = {
    async download(): Promise<void> {
        const res = await authFetch(`${API_BASE}/pdf/gerar`);
        if (!res.ok) {
            const error = await res.json().catch(() => ({ error: 'Erro ao gerar PDF' }));
            throw new Error(error.error || 'Erro ao gerar PDF');
        }
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `grade-escolar-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }
};
