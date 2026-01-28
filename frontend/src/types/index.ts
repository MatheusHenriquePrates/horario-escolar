export type SubjectName =
    | 'Português'
    | 'Matemática'
    | 'História'
    | 'Geografia'
    | 'Ciências'
    | 'Inglês'
    | 'Educação Física'
    | 'Artes'
    | 'Educação Digital'
    | 'Educação Financeira'
    | 'Educação Ambiental'
    | 'Ensino Religioso'
    | 'Projeto de Vida'
    | 'Estudo Orientado';

export interface Teacher {
    id: string;
    name: string;
    workloadMonthly: number;
    color: string;
    allocations: {
        subject: string;
        lessonsPerWeek: number;
        classes: string[];
    }[];
}

export interface Lesson {
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
            [classId: string]: Lesson;
        };
    };
};

// ============================================
// CONSTANTES - TEMPO INTEGRAL
// ============================================

export const WEEKDAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];

export const ALL_CLASSES = [
    '6A', '6B', '6C', '6D', '6E',
    '7A', '7B', '7C', '7D', '7E',
    '8A', '8B', '8C', '8D',
    '9A', '9B', '9C', '9D'
];

// Aulas por dia (SEXTA TERMINA MAIS CEDO)
export const LESSONS_PER_DAY: Record<number, number> = {
    0: 7, // Segunda
    1: 7, // Terça
    2: 7, // Quarta
    3: 7, // Quinta
    4: 6, // Sexta (sem 7ª aula)
};

// Horários - TEMPO INTEGRAL
export const TIMESLOTS = [
    { id: 0, label: '07:30 - 08:20', name: '1ª Aula', type: 'lesson', periodo: 'manhã' },
    { id: 1, label: '08:20 - 09:10', name: '2ª Aula', type: 'lesson', periodo: 'manhã' },
    { id: 'recreio', label: '09:10 - 09:30', name: 'RECREIO', type: 'break', periodo: 'manhã' },
    { id: 2, label: '09:30 - 10:20', name: '3ª Aula', type: 'lesson', periodo: 'manhã' },
    { id: 3, label: '10:20 - 11:10', name: '4ª Aula', type: 'lesson', periodo: 'manhã' },
    { id: 4, label: '11:10 - 12:00', name: '5ª Aula', type: 'lesson', periodo: 'manhã' },
    { id: 'almoco', label: '12:00 - 13:30', name: 'ALMOÇO', type: 'break', periodo: 'intervalo' },
    { id: 5, label: '13:30 - 14:20', name: '6ª Aula', type: 'lesson', periodo: 'tarde' },
    { id: 6, label: '14:20 - 15:10', name: '7ª Aula', type: 'lesson', periodo: 'tarde' },
    { id: 'lanche', label: '15:10 - 15:20', name: 'LANCHE', type: 'break', periodo: 'tarde' },
];

// Siglas das disciplinas
export const SUBJECT_ABBREVIATIONS: Record<string, string> = {
    'Português': 'LP',
    'Matemática': 'MT',
    'História': 'HIST',
    'Geografia': 'GF',
    'Ciências': 'CFB',
    'Educação Física': 'E.FIS',
    'Inglês': 'ING',
    'Artes': 'ARTE',
    'Educação Digital': 'ED.D',
    'Educação Financeira': 'E.FIN',
    'Educação Ambiental': 'EAMB',
    'Ensino Religioso': 'E.R',
    'Projeto de Vida': 'P.V',
    'Estudo Orientado': 'E.OR',
};

// For backward compatibility code that might rely on SUBJECTS array
export const SUBJECTS = Object.keys(SUBJECT_ABBREVIATIONS) as SubjectName[];

// Helper to check if a valid class ID
export type ClassId = typeof ALL_CLASSES[number];
