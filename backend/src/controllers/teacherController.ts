import { Request, Response } from 'express';
import { prisma } from '../utils/prismaClient';

// Remove local new PrismaClient()
// const prisma = new PrismaClient();

/**
 * Valida se a distribuição está balanceada entre as séries
 */
function validateDistributionBalance(disciplinas: any[]): { valid: boolean; warnings: string[] } {
    const warnings: string[] = [];

    for (const disciplina of disciplinas) {
        const turmasPorSerie = new Map<string, number>();

        // Conta turmas por série
        for (const turma of disciplina.turmas) {
            const serie = turma.charAt(0); // '6', '7', '8', '9'
            turmasPorSerie.set(serie, (turmasPorSerie.get(serie) || 0) + 1);
        }

        // Verifica se há concentração excessiva em uma série
        const totalTurmas = disciplina.turmas.length;
        const series = Array.from(turmasPorSerie.entries());

        for (const [serie, count] of series) {
            const percentual = (count / totalTurmas) * 100;
            if (totalTurmas >= 4 && percentual > 70) {
                warnings.push(
                    `${disciplina.nome}: ${percentual.toFixed(0)}% das turmas no ${serie}º ano (${count}/${totalTurmas})`
                );
            }
        }
    }

    return { valid: true, warnings };
}

export const getTeachers = async (req: Request, res: Response) => {
    try {
        const teachers = await prisma.teacher.findMany({
            include: {
                allocations: {
                    include: {
                        classes: true
                    }
                }
            }
        });

        const formatted = teachers.map((t: any) => ({
            ...t,
            allocations: t.allocations.map((a: any) => ({
                id: a.id,
                subject: a.subject,
                lessonsPerWeek: a.lessonsPerWeek,
                classes: a.classes.map((c: any) => c.classId)
            }))
        }));

        res.json(formatted);
    } catch (error) {
        console.error("GET TEACHERS ERROR:", error);
        res.status(500).json({ error: 'Error fetching teachers', details: error });
    }
};

export const createTeacher = async (req: Request, res: Response) => {
    try {
        console.log('📥 Dados recebidos:', JSON.stringify(req.body, null, 2));

        const { nome, cargaHoraria, disciplinas, color } = req.body;

        // Validações
        if (!nome || typeof nome !== 'string') {
            return res.status(400).json({ error: 'Nome é obrigatório' });
        }
        if (!cargaHoraria || typeof cargaHoraria !== 'number') {
            return res.status(400).json({ error: 'Carga horária é obrigatória' });
        }
        if (!disciplinas || !Array.isArray(disciplinas) || disciplinas.length === 0) {
            return res.status(400).json({ error: 'Pelo menos uma disciplina é obrigatória' });
        }

        // Validar estrutura das disciplinas

        // Validar cada disciplina
        for (let i = 0; i < disciplinas.length; i++) {
            const d = disciplinas[i];

            console.log(`   Validando disciplina ${i}:`, d);

            if (!d.nome || typeof d.nome !== 'string') {
                return res.status(400).json({
                    error: `Disciplina ${i}: nome inválido`,
                    received: d
                });
            }

            if (!d.aulasPorSemana || typeof d.aulasPorSemana !== 'number') {
                return res.status(400).json({
                    error: `Disciplina ${i}: aulasPorSemana inválido`,
                    received: d
                });
            }

            if (!d.turmas || !Array.isArray(d.turmas) || d.turmas.length === 0) {
                return res.status(400).json({
                    error: `Disciplina ${i}: turmas deve ser array não vazio`,
                    received: d
                });
            }

            // Verificar se há valores null nas turmas
            const turmasInvalidas = d.turmas.filter((t: any) => t === null || t === undefined || t === '');
            if (turmasInvalidas.length > 0) {
                return res.status(400).json({
                    error: `Disciplina ${i}: contém turmas inválidas (null/undefined)`,
                    turmas: d.turmas,
                    invalidas: turmasInvalidas
                });
            }
        }

        // Validar balanceamento da distribuição
        const balanceCheck = validateDistributionBalance(disciplinas);
        if (balanceCheck.warnings.length > 0) {
            console.warn('⚠️  Avisos de balanceamento:');
            balanceCheck.warnings.forEach(w => console.warn(`   - ${w}`));
        }

        const teacherColor = color || `hsl(${Math.floor(Math.random() * 360)}, 70%, 80%)`;

        console.log('🔄 Criando professor no banco...');

        const teacher = await prisma.teacher.create({
            data: {
                name: nome,
                workloadMonthly: cargaHoraria,
                color: teacherColor,
                allocations: {
                    create: disciplinas.map((d: any) => ({
                        subject: d.nome,
                        lessonsPerWeek: d.aulasPorSemana,
                        classes: {
                            create: d.turmas.map((turma: string) => ({
                                classId: turma
                            }))
                        }
                    }))
                }
            },
            include: {
                allocations: {
                    include: { classes: true }
                }
            }
        });

        console.log('✅ Professor criado:', teacher.id);

        const formatted = {
            ...teacher,
            allocations: teacher.allocations.map((a: any) => ({
                id: a.id,
                subject: a.subject,
                lessonsPerWeek: a.lessonsPerWeek,
                classes: a.classes.map((c: any) => c.classId)
            }))
        };

        res.status(201).json(formatted);
    } catch (error: any) {
        console.error('❌ ERRO DETALHADO:', error);
        console.error('Stack:', error.stack);
        res.status(500).json({
            error: 'Error creating teacher',
            details: error.message,
            code: error.code
        });
    }
};

export const getTeacherById = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const teacher = await prisma.teacher.findUnique({
            where: { id },
            include: {
                allocations: { include: { classes: true } }
            }
        });
        if (!teacher) {
            res.status(404).json({ error: 'Teacher not found' });
            return;
        }

        const formatted = {
            ...teacher,
            allocations: (teacher as any).allocations.map((a: any) => ({
                id: a.id,
                subject: a.subject,
                lessonsPerWeek: a.lessonsPerWeek,
                classes: a.classes.map((c: any) => c.classId)
            }))
        };

        res.json(formatted);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching teacher' });
    }
};

export const updateTeacher = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { nome, cargaHoraria, disciplinas, color } = req.body;

    try {
        const updated = await prisma.$transaction(async (tx: any) => {
            await tx.teacher.update({
                where: { id },
                data: {
                    name: nome,
                    workloadMonthly: cargaHoraria,
                    color
                }
            });

            await tx.allocation.deleteMany({
                where: { teacherId: id }
            });

            for (const d of disciplinas) {
                await tx.allocation.create({
                    data: {
                        teacherId: id,
                        subject: d.nome,
                        lessonsPerWeek: d.aulasPorSemana,
                        classes: {
                            create: d.turmas.map((t: string) => ({ classId: t }))
                        }
                    }
                });
            }

            return await tx.teacher.findUnique({
                where: { id },
                include: { allocations: { include: { classes: true } } }
            });
        });

        if (!updated) {
            res.status(404).json({ error: "Teacher not found" });
            return;
        }

        const formatted = {
            ...updated,
            allocations: (updated as any).allocations.map((a: any) => ({
                id: a.id,
                subject: a.subject,
                lessonsPerWeek: a.lessonsPerWeek,
                classes: a.classes.map((c: any) => c.classId)
            }))
        };

        res.json(formatted);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error updating teacher" });
    }
};

export const deleteTeacher = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        console.log(`🗑️  Deletando professor ${id}...`);

        // IMPORTANTE: Deletar também todas as aulas deste professor na grade
        const deletedLessons = await prisma.lesson.deleteMany({
            where: { teacherId: id }
        });

        console.log(`   ✅ ${deletedLessons.count} aulas removidas da grade`);

        // Agora deleta o professor (Allocations serão deletadas em cascata)
        await prisma.teacher.delete({ where: { id } });

        console.log(`   ✅ Professor deletado com sucesso`);

        res.json({
            success: true,
            lessonsDeleted: deletedLessons.count
        });
    } catch (error) {
        console.error('❌ Erro ao deletar professor:', error);
        res.status(500).json({ error: 'Error deleting teacher' });
    }
};

/**
 * Retorna estatísticas de distribuição das turmas
 */
export const getDistributionStats = async (req: Request, res: Response) => {
    try {
        const teachers = await prisma.teacher.findMany({
            include: {
                allocations: {
                    include: { classes: true }
                }
            }
        });

        // Conta turmas ocupadas por disciplina e série
        const statsBySubject = new Map<string, Map<string, Set<string>>>();

        for (const teacher of teachers) {
            // FIX: Iterar allocations do teacher, não teachers novamente
            for (const alloc of teacher.allocations) {
                if (!statsBySubject.has(alloc.subject)) {
                    statsBySubject.set(alloc.subject, new Map());
                }

                const subjectMap = statsBySubject.get(alloc.subject)!;

                for (const classItem of alloc.classes) {
                    const serie = (classItem as any).classId.charAt(0);
                    if (!subjectMap.has(serie)) {
                        subjectMap.set(serie, new Set());
                    }
                    subjectMap.get(serie)!.add((classItem as any).classId);
                }
            }
        }

        // Formata resultado
        const result = Array.from(statsBySubject.entries()).map(([subject, seriesMap]) => {
            const byGrade = Array.from(seriesMap.entries()).map(([grade, classes]) => ({
                grade: `${grade}º ano`,
                count: classes.size,
                classes: Array.from(classes).sort()
            }));

            const total = byGrade.reduce((sum, g) => sum + g.count, 0);

            return {
                subject,
                total,
                byGrade,
                balanced: byGrade.length >= 3 && Math.max(...byGrade.map(g => g.count)) - Math.min(...byGrade.map(g => g.count)) <= 2
            };
        });

        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error getting distribution stats' });
    }
};
