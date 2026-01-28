import { Request, Response } from 'express';
import { generatePDF } from '../services/pdfGenerator';
import { prisma } from '../utils/prismaClient';
import { Lesson, Teacher } from '@prisma/client';

interface ScheduleSlot {
    teacherId: string;
    subject: string;
}

type ScheduleGrid = {
    [day: number]: {
        [slot: number]: {
            [classId: string]: ScheduleSlot;
        };
    };
};

interface FormattedTeacher {
    id: string;
    name: string;
    color: string;
}

export const downloadPDF = async (req: Request, res: Response): Promise<void> => {
    try {
        console.log('--- INICIANDO EXPORTAÇÃO PDF ---');

        // Buscar professores com suas alocações
        const teachers = await prisma.teacher.findMany({
            include: {
                allocations: {
                    include: { classes: true }
                }
            }
        });

        // Buscar todas as aulas geradas
        const lessons = await prisma.lesson.findMany();

        if (lessons.length === 0) {
            res.status(404).json({ error: 'Nenhum horário gerado para exportar.' });
            return;
        }

        // Montar objeto schedule no formato [dia][slot][turma]
        const schedule: ScheduleGrid = {};

        lessons.forEach((lesson: Lesson) => {
            if (!schedule[lesson.day]) {
                schedule[lesson.day] = {};
            }
            if (!schedule[lesson.day][lesson.timeSlot]) {
                schedule[lesson.day][lesson.timeSlot] = {};
            }
            schedule[lesson.day][lesson.timeSlot][lesson.classId] = {
                teacherId: lesson.teacherId,
                subject: lesson.subject
            };
        });

        // Formatar lista de professores para o PDF
        const formattedTeachers: FormattedTeacher[] = teachers.map((t: Teacher) => ({
            id: t.id,
            name: t.name,
            color: t.color || '#CCCCCC'
        }));

        // Gerar Buffer do PDF
        const pdfBuffer = await generatePDF(schedule, formattedTeachers);

        // Configurar Headers de Download
        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `grade_escolar_${dateStr}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', pdfBuffer.length);

        console.log(`✅ PDF Gerado com sucesso: ${filename} (${pdfBuffer.length} bytes)`);
        res.send(pdfBuffer);

    } catch (error) {
        console.error('❌ Erro no downloadPDF:', error);
        res.status(500).json({
            error: 'Erro interno ao gerar o arquivo PDF.',
            details: error instanceof Error ? error.message : String(error)
        });
    }
};
