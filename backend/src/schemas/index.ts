import { z } from 'zod';

// ==================== AUTH SCHEMAS ====================

export const loginSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(1, 'Senha é obrigatória')
});

export const registerSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
    name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
    role: z.enum(['admin', 'coordenador', 'professor']).optional().default('coordenador')
});

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
    newPassword: z.string().min(6, 'Nova senha deve ter no mínimo 6 caracteres')
});

// ==================== TEACHER SCHEMAS ====================

const disciplinaSchema = z.object({
    nome: z.string().min(1, 'Nome da disciplina é obrigatório'),
    aulasPorSemana: z.number().int().min(1).max(10),
    turmas: z.array(z.string().regex(/^[6-9][A-E]$/, 'Turma inválida (ex: 6A, 7B, 8C, 9D)'))
        .min(1, 'Selecione pelo menos uma turma')
});

export const createTeacherSchema = z.object({
    nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
    cargaHoraria: z.number().int().min(40, 'Carga horária mínima é 40h').max(200, 'Carga horária máxima é 200h'),
    color: z.string().optional(),
    disciplinas: z.array(disciplinaSchema).min(1, 'Selecione pelo menos uma disciplina')
});

export const updateTeacherSchema = createTeacherSchema;

// ==================== SCHEDULE SCHEMAS ====================

export const generateScheduleSchema = z.object({
    professores: z.array(z.string().uuid('ID de professor inválido')).optional()
});

export const updateLessonSchema = z.object({
    dia: z.number().int().min(0).max(4),
    horario: z.number().int().min(0).max(6),
    turma: z.string().regex(/^[6-9][A-E]$/, 'Turma inválida'),
    professorId: z.string().uuid('ID de professor inválido'),
    disciplina: z.string().min(1, 'Disciplina é obrigatória')
});

export const deleteLessonSchema = z.object({
    dia: z.number().int().min(0).max(4),
    horario: z.number().int().min(0).max(6),
    turma: z.string().regex(/^[6-9][A-E]$/, 'Turma inválida')
});

// ==================== VALIDATION HELPER ====================

import { Request, Response, NextFunction } from 'express';

/**
 * Middleware factory para validar body da requisição com Zod
 */
export function validateBody<T>(schema: z.ZodSchema<T>) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const result = schema.safeParse(req.body);

        if (!result.success) {
            const errors = result.error.issues.map((issue: z.ZodIssue) => ({
                field: issue.path.join('.'),
                message: issue.message
            }));

            res.status(400).json({
                error: 'Dados inválidos',
                details: errors
            });
            return;
        }

        // Substitui body pelos dados validados e tipados
        req.body = result.data;
        next();
    };
}

/**
 * Middleware factory para validar params da requisição com Zod
 */
export function validateParams<T>(schema: z.ZodSchema<T>) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const result = schema.safeParse(req.params);

        if (!result.success) {
            const errors = result.error.issues.map((issue: z.ZodIssue) => ({
                field: issue.path.join('.'),
                message: issue.message
            }));

            res.status(400).json({
                error: 'Parâmetros inválidos',
                details: errors
            });
            return;
        }

        next();
    };
}

// Schema para validar UUID em params
export const uuidParamSchema = z.object({
    id: z.string().uuid('ID inválido')
});

// Types exportados
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type CreateTeacherInput = z.infer<typeof createTeacherSchema>;
export type UpdateTeacherInput = z.infer<typeof updateTeacherSchema>;
export type GenerateScheduleInput = z.infer<typeof generateScheduleSchema>;
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>;
export type DeleteLessonInput = z.infer<typeof deleteLessonSchema>;
