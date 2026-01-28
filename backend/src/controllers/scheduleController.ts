import { Request, Response } from 'express';
// @ts-ignore
import { PrismaClient } from '@prisma/client';
import { prisma } from '../utils/prismaClient'; // Use singleton
import { generateScheduleLogic } from '../services/scheduler';

// Helper to format linear lessons into Grid Matrix
const formatToGrid = (lessons: any[]) => {
    const grid: any = {};
    for (let d = 0; d < 5; d++) {
        grid[d] = {};
        for (let s = 0; s < 7; s++) grid[d][s] = {};
    }

    lessons.forEach(l => {
        if (!grid[l.day]) grid[l.day] = {};
        if (!grid[l.day][l.timeSlot]) grid[l.day][l.timeSlot] = {};
        grid[l.day][l.timeSlot][l.classId] = l;
    });
    return grid;
};

export const generateSchedule = async (req: Request, res: Response) => {
    try {
        const { professores } = req.body || {};
        // If no teachers provided, fetch all
        let teacherIds = professores;
        if (!teacherIds || teacherIds.length === 0) {
            const all = await prisma.teacher.findMany({ select: { id: true } });
            teacherIds = all.map((t: any) => t.id);
        }

        const result = await generateScheduleLogic(teacherIds);

        if (result.success) {
            return res.json({
                message: 'Horário gerado com sucesso!',
                scheduleId: result.scheduleId,
                warnings: result.avisos || []
            });
        } else {
            return res.status(400).json({
                message: 'Erro ao gerar horário',
                details: result.erro || 'Falha desconhecida',
                analysis: result.erro // The new logic returns a detailed string in 'erro'
            });
        }
    } catch (error) {
        console.error('❌ Erro ao gerar grade:', error);
        res.status(500).json({
            error: 'Erro ao gerar grade',
            message: process.env.NODE_ENV === 'development' ? String(error) : undefined
        });
    }
};

export const getSchedule = async (req: Request, res: Response) => {
    try {
        // Get latest active schedule
        const schedule = await prisma.schedule.findFirst({
            orderBy: { createdAt: 'desc' },
            include: { lessons: true }
        });

        if (!schedule) {
            return res.json({});
        }

        res.json(formatToGrid((schedule as any).lessons));
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar grade' });
    }
};

export const getScheduleByClass = async (req: Request, res: Response) => {
    try {
        const turma = req.params.turma as string;
        const schedule = await prisma.schedule.findFirst({
            orderBy: { createdAt: 'desc' },
            include: {
                lessons: {
                    where: { classId: turma }
                }
            }
        });

        if (!schedule) return res.json({});
        res.json(formatToGrid((schedule as any).lessons));
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar grade da turma' });
    }
};

export const getScheduleByTeacher = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const schedule = await prisma.schedule.findFirst({
            orderBy: { createdAt: 'desc' },
            include: {
                lessons: {
                    where: { teacherId: id }
                }
            }
        });
        if (!schedule) return res.json({});
        res.json(formatToGrid((schedule as any).lessons));
    } catch (err) {
        res.status(500).json({ error: 'Erro ao buscar grade do professor' });
    }
};

export const updateLesson = async (req: Request, res: Response) => {
    try {
        const { dia, horario, turma, professorId, disciplina } = req.body;

        // Find latest schedule
        const schedule = await prisma.schedule.findFirst({
            orderBy: { createdAt: 'desc' }
        });

        if (!schedule) {
            res.status(404).json({ error: "Nenhuma grade ativa" });
            return;
        }

        // Check if there is already a lesson there for this class
        const existing = await prisma.lesson.findFirst({
            where: {
                scheduleId: schedule.id,
                day: dia,
                timeSlot: horario,
                classId: turma
            }
        });

        if (existing) {
            // Update
            await prisma.lesson.update({
                where: { id: existing.id },
                data: {
                    teacherId: professorId,
                    subject: disciplina,
                    locked: true // Manual edit locks it?
                }
            });
        } else {
            // Create
            await prisma.lesson.create({
                data: {
                    scheduleId: schedule.id,
                    teacherId: professorId,
                    subject: disciplina,
                    classId: turma,
                    day: dia,
                    timeSlot: horario,
                    locked: true
                }
            });
        }

        res.json({ sucesso: true, conflitos: [] });
    } catch (err) {
        res.status(500).json({ error: "Erro ao atualizar aula" });
    }
};

export const deleteLesson = async (req: Request, res: Response) => {
    try {
        const { dia, horario, turma } = req.body;
        const schedule = await prisma.schedule.findFirst({
            orderBy: { createdAt: 'desc' }
        });

        if (!schedule) {
            res.status(404).json({ error: "Nenhuma grade ativa" });
            return;
        }

        // We assume only 1 lesson per class per slot (constraint of DB usually, or App logic)
        // Prisma delete requires unique ID or deleteMany
        await prisma.lesson.deleteMany({
            where: {
                scheduleId: schedule.id,
                day: dia,
                timeSlot: horario,
                classId: turma
            }
        });

        res.json({ sucesso: true });
    } catch (err) {
        res.status(500).json({ error: "Erro ao remover aula" });
    }
};
