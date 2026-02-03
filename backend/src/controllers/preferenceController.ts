import { Request, Response } from 'express';
import { prisma } from '../utils/prismaClient';

/**
 * Obtém as preferências de um professor
 */
export const getTeacherPreferences = async (req: Request, res: Response) => {
    try {
        const teacherId = String(req.params.teacherId);
        
        // Verificar se professor existe
        const teacher = await prisma.teacher.findUnique({ 
            where: { id: teacherId } 
        });
        
        if (!teacher) {
            return res.status(404).json({ error: 'Professor não encontrado' });
        }
        
        let preferences = await prisma.teacherPreference.findUnique({
            where: { teacherId }
        });
        
        // Se não existe, retorna valores padrão
        if (!preferences) {
            preferences = {
                id: '',
                teacherId,
                turnoPreferido: null,
                maxAulasDia: null,
                maxAulasSemana: null,
                diasIndisponiveis: [],
                horariosIndisponiveis: [],
                prefereSalasFixas: false,
                evitarAulasConsecutivas: 3,
                observacoes: null,
                createdAt: new Date(),
                updatedAt: new Date()
            };
        }
        
        res.json({
            professor: {
                id: teacher.id,
                nome: teacher.name
            },
            preferencias: preferences
        });
    } catch (error: any) {
        console.error('❌ Erro ao buscar preferências:', error);
        res.status(500).json({ 
            error: 'Erro ao buscar preferências',
            details: error.message
        });
    }
};

/**
 * Atualiza/cria preferências de um professor
 */
export const updateTeacherPreferences = async (req: Request, res: Response) => {
    try {
        const teacherId = String(req.params.teacherId);
        const { 
            turnoPreferido, 
            maxAulasDia, 
            maxAulasSemana,
            diasIndisponiveis,
            horariosIndisponiveis,
            prefereSalasFixas,
            evitarAulasConsecutivas,
            observacoes
        } = req.body;
        
        // Verificar se professor existe
        const teacher = await prisma.teacher.findUnique({ 
            where: { id: teacherId } 
        });
        
        if (!teacher) {
            return res.status(404).json({ error: 'Professor não encontrado' });
        }
        
        console.log(`🔄 Atualizando preferências do professor ${teacher.name}`);
        
        // Validações
        if (turnoPreferido && !['manha', 'tarde', 'ambos'].includes(turnoPreferido)) {
            return res.status(400).json({ 
                error: 'Turno preferido inválido. Use: manha, tarde ou ambos' 
            });
        }
        
        if (diasIndisponiveis) {
            const diasValidos = diasIndisponiveis.every((d: number) => d >= 0 && d <= 4);
            if (!diasValidos) {
                return res.status(400).json({ 
                    error: 'Dias inválidos. Use valores de 0 (Segunda) a 4 (Sexta)' 
                });
            }
        }
        
        // Upsert (cria ou atualiza)
        const preferences = await prisma.teacherPreference.upsert({
            where: { teacherId },
            update: {
                turnoPreferido: turnoPreferido !== undefined ? turnoPreferido : undefined,
                maxAulasDia: maxAulasDia !== undefined ? maxAulasDia : undefined,
                maxAulasSemana: maxAulasSemana !== undefined ? maxAulasSemana : undefined,
                diasIndisponiveis: diasIndisponiveis !== undefined ? diasIndisponiveis : undefined,
                horariosIndisponiveis: horariosIndisponiveis !== undefined ? horariosIndisponiveis : undefined,
                prefereSalasFixas: prefereSalasFixas !== undefined ? prefereSalasFixas : undefined,
                evitarAulasConsecutivas: evitarAulasConsecutivas !== undefined ? evitarAulasConsecutivas : undefined,
                observacoes: observacoes !== undefined ? observacoes : undefined
            },
            create: {
                teacherId,
                turnoPreferido: turnoPreferido || null,
                maxAulasDia: maxAulasDia || null,
                maxAulasSemana: maxAulasSemana || null,
                diasIndisponiveis: diasIndisponiveis || [],
                horariosIndisponiveis: horariosIndisponiveis || [],
                prefereSalasFixas: prefereSalasFixas || false,
                evitarAulasConsecutivas: evitarAulasConsecutivas || 3,
                observacoes: observacoes || null
            }
        });
        
        console.log(`✅ Preferências atualizadas`);
        res.json({
            professor: {
                id: teacher.id,
                nome: teacher.name
            },
            preferencias: preferences
        });
    } catch (error: any) {
        console.error('❌ Erro ao atualizar preferências:', error);
        res.status(500).json({ 
            error: 'Erro ao atualizar preferências',
            details: error.message
        });
    }
};

/**
 * Lista todos os professores com suas preferências
 */
export const getAllPreferences = async (req: Request, res: Response) => {
    try {
        const teachers = await prisma.teacher.findMany({
            include: {
                preferences: true
            },
            orderBy: { name: 'asc' }
        });
        
        const result = teachers.map((t: any) => ({
            professor: {
                id: t.id,
                nome: t.name,
                cargaHoraria: t.workloadMonthly
            },
            preferencias: t.preferences || {
                turnoPreferido: null,
                maxAulasDia: null,
                maxAulasSemana: null,
                diasIndisponiveis: [],
                horariosIndisponiveis: [],
                prefereSalasFixas: false,
                evitarAulasConsecutivas: 3,
                observacoes: null
            },
            temPreferencias: !!t.preferences
        }));
        
        res.json(result);
    } catch (error: any) {
        console.error('❌ Erro ao buscar preferências:', error);
        res.status(500).json({ 
            error: 'Erro ao buscar preferências',
            details: error.message
        });
    }
};

/**
 * Remove as preferências de um professor (volta ao padrão)
 */
export const deleteTeacherPreferences = async (req: Request, res: Response) => {
    try {
        const teacherId = String(req.params.teacherId);
        
        const teacher = await prisma.teacher.findUnique({ 
            where: { id: teacherId } 
        });
        
        if (!teacher) {
            return res.status(404).json({ error: 'Professor não encontrado' });
        }
        
        const existing = await prisma.teacherPreference.findUnique({
            where: { teacherId }
        });
        
        if (!existing) {
            return res.status(404).json({ error: 'Professor não tem preferências configuradas' });
        }
        
        await prisma.teacherPreference.delete({
            where: { teacherId }
        });
        
        console.log(`🗑️ Preferências do professor ${teacher.name} removidas`);
        res.json({ 
            success: true, 
            message: `Preferências de "${teacher.name}" removidas com sucesso` 
        });
    } catch (error: any) {
        console.error('❌ Erro ao remover preferências:', error);
        res.status(500).json({ 
            error: 'Erro ao remover preferências',
            details: error.message
        });
    }
};

/**
 * Verifica conflitos de um professor
 */
export const checkTeacherConflicts = async (req: Request, res: Response) => {
    try {
        const teacherId = String(req.params.teacherId);
        
        const teacher: any = await prisma.teacher.findUnique({ 
            where: { id: teacherId },
            include: {
                preferences: true,
                allocations: {
                    include: { classes: true }
                }
            }
        });
        
        if (!teacher) {
            return res.status(404).json({ error: 'Professor não encontrado' });
        }
        
        const prefs = teacher.preferences;
        const conflitos: string[] = [];
        const avisos: string[] = [];
        
        // Calcular total de aulas necessárias
        let totalAulas = 0;
        teacher.allocations.forEach((a: any) => {
            totalAulas += a.lessonsPerWeek * a.classes.length;
        });
        
        // Verificar se cabe na semana
        const diasDisponiveis = 5 - (prefs?.diasIndisponiveis?.length || 0);
        const maxPorDia = prefs?.maxAulasDia || 7;
        const capacidadeSemanal = diasDisponiveis * maxPorDia;
        
        if (totalAulas > capacidadeSemanal) {
            conflitos.push(
                `Professor tem ${totalAulas} aulas mas só pode dar ${capacidadeSemanal} ` +
                `(${diasDisponiveis} dias × ${maxPorDia} aulas/dia)`
            );
        }
        
        // Verificar limite semanal
        if (prefs?.maxAulasSemana && totalAulas > prefs.maxAulasSemana) {
            conflitos.push(
                `Professor tem ${totalAulas} aulas mas limite semanal é ${prefs.maxAulasSemana}`
            );
        }
        
        // Verificar horários indisponíveis vs turno preferido
        if (prefs?.turnoPreferido === 'manha' && prefs?.horariosIndisponiveis?.some((h: string) => h.startsWith('0-') || h.startsWith('1-'))) {
            avisos.push('Professor prefere manhã mas tem horários matutinos indisponíveis');
        }
        
        res.json({
            professor: {
                id: teacher.id,
                nome: teacher.name,
                totalAulas
            },
            analise: {
                diasDisponiveis,
                maxPorDia,
                capacidadeSemanal,
                temConflitos: conflitos.length > 0
            },
            conflitos,
            avisos
        });
    } catch (error: any) {
        console.error('❌ Erro ao verificar conflitos:', error);
        res.status(500).json({ 
            error: 'Erro ao verificar conflitos',
            details: error.message
        });
    }
};
