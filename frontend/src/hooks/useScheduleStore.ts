import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Teacher, ScheduleGrid } from '../types';
import { teacherAPI, scheduleAPI, type TeacherFromAPI } from '../services/api';

interface ScheduleState {
    teachers: Teacher[];
    schedule: ScheduleGrid;
    generatedDate: string | null;
    isLoading: boolean;
    error: string | null;

    // Sync com backend
    fetchTeachers: () => Promise<void>;
    fetchSchedule: () => Promise<void>;

    // Teacher actions
    addTeacherToBackend: (data: {
        nome: string;
        cargaHoraria: number;
        color?: string;
        disciplinas: {
            nome: string;
            aulasPorSemana: number;
            turmas: string[];
        }[];
    }) => Promise<Teacher>;
    removeTeacherFromBackend: (id: string) => Promise<void>;

    // Schedule actions
    generateSchedule: (selectedTeacherIds?: string[]) => Promise<{ success: boolean; message: string; warnings?: string[] }>;
    setSchedule: (schedule: ScheduleGrid) => void;
    resetSchedule: () => void;
    clearAll: () => void;
    setError: (error: string | null) => void;
}

const convertAPITeacher = (apiTeacher: TeacherFromAPI): Teacher => ({
    id: apiTeacher.id,
    name: apiTeacher.name,
    workloadMonthly: apiTeacher.workloadMonthly,
    color: apiTeacher.color,
    allocations: apiTeacher.allocations.map(a => ({
        subject: a.subject,
        lessonsPerWeek: a.lessonsPerWeek,
        classes: a.classes
    }))
});

export const useScheduleStore = create<ScheduleState>()(
    persist(
        (set, get) => ({
            teachers: [],
            schedule: {},
            generatedDate: null,
            isLoading: false,
            error: null,

            fetchTeachers: async () => {
                set({ isLoading: true, error: null });
                try {
                    const apiTeachers = await teacherAPI.getAll();
                    const teachers = apiTeachers.map(convertAPITeacher);
                    set({ teachers, isLoading: false });
                } catch (err) {
                    const message = err instanceof Error ? err.message : 'Erro ao buscar professores';
                    set({ error: message, isLoading: false });
                    throw err;
                }
            },

            fetchSchedule: async () => {
                set({ isLoading: true, error: null });
                try {
                    const schedule = await scheduleAPI.get();
                    set({
                        schedule,
                        isLoading: false,
                        generatedDate: Object.keys(schedule).length > 0 ? new Date().toISOString() : null
                    });
                } catch (err) {
                    const message = err instanceof Error ? err.message : 'Erro ao buscar grade';
                    set({ error: message, isLoading: false });
                    throw err;
                }
            },

            addTeacherToBackend: async (data) => {
                set({ isLoading: true, error: null });
                try {
                    const apiTeacher = await teacherAPI.create(data);
                    const teacher = convertAPITeacher(apiTeacher);
                    set((state) => ({
                        teachers: [...state.teachers, teacher],
                        isLoading: false
                    }));
                    return teacher;
                } catch (err) {
                    const message = err instanceof Error ? err.message : 'Erro ao criar professor';
                    set({ error: message, isLoading: false });
                    throw err;
                }
            },

            removeTeacherFromBackend: async (id) => {
                set({ isLoading: true, error: null });
                try {
                    await teacherAPI.delete(id);

                    // Buscar grade atualizada do backend (para sincronizar)
                    let updatedSchedule = {};
                    try {
                        updatedSchedule = await scheduleAPI.get();
                    } catch (e) {
                        console.warn('Não foi possível buscar grade atualizada:', e);
                    }

                    set((state) => ({
                        teachers: state.teachers.filter((t) => t.id !== id),
                        schedule: updatedSchedule, // 🔄 Atualiza com a grade do servidor
                        generatedDate: Object.keys(updatedSchedule).length > 0 ? state.generatedDate : null,
                        isLoading: false
                    }));
                } catch (err) {
                    const message = err instanceof Error ? err.message : 'Erro ao deletar professor';
                    set({ error: message, isLoading: false });
                    throw err;
                }
            },

            generateSchedule: async (selectedTeacherIds?: string[]) => {
                set({ isLoading: true, error: null });
                try {
                    // 🔄 Busca professores FRESCOS do backend antes de gerar
                    // Isso garante que todos os professores sejam incluídos
                    const apiTeachers = await teacherAPI.getAll();
                    const freshTeachers = apiTeachers.map(convertAPITeacher);

                    // Se IDs foram fornecidos, usar apenas eles, senão usar todos
                    const teacherIds = selectedTeacherIds && selectedTeacherIds.length > 0
                        ? selectedTeacherIds
                        : freshTeachers.map(t => t.id);

                    console.log('🔄 Gerando grade com professores:', {
                        total: teacherIds.length,
                        ids: teacherIds,
                        names: freshTeachers.filter(t => teacherIds.includes(t.id)).map(t => t.name),
                        selecionados: selectedTeacherIds ? 'SIM' : 'TODOS'
                    });

                    if (teacherIds.length === 0) {
                        throw new Error('Cadastre pelo menos um professor antes de gerar horários.');
                    }

                    const response = await scheduleAPI.generate(teacherIds);
                    const schedule = await scheduleAPI.get();

                    // Atualiza estado com professores frescos também
                    set({
                        teachers: freshTeachers,
                        schedule,
                        isLoading: false,
                        generatedDate: new Date().toISOString()
                    });

                    return {
                        success: true,
                        message: response.message,
                        warnings: response.warnings
                    };
                } catch (err) {
                    const message = err instanceof Error ? err.message : 'Erro ao gerar horários';
                    set({ error: message, isLoading: false });
                    return { success: false, message };
                }
            },

            setSchedule: (schedule) => set({
                schedule,
                generatedDate: new Date().toISOString()
            }),

            resetSchedule: () => set({ schedule: {}, generatedDate: null }),
            clearAll: () => set({ teachers: [], schedule: {}, generatedDate: null }),
            setError: (error) => set({ error })
        }),
        {
            name: 'school-scheduler-storage',
            partialize: (state) => ({
                teachers: state.teachers,
                schedule: state.schedule,
                generatedDate: state.generatedDate
            })
        }
    )
);
