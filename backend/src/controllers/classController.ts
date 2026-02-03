import { Request, Response } from 'express';
import { prisma } from '../utils/prismaClient';

/**
 * Lista todas as turmas
 */
export const getClasses = async (req: Request, res: Response) => {
    try {
        const { serie, turno, ativo } = req.query;
        
        const where: any = {};
        if (serie) where.serie = Number(serie);
        if (turno) where.turno = turno;
        if (ativo !== undefined) where.ativo = ativo === 'true';
        
        const classes = await prisma.class.findMany({
            where,
            orderBy: [
                { serie: 'asc' },
                { codigo: 'asc' }
            ]
        });
        
        res.json(classes);
    } catch (error: any) {
        console.error('❌ Erro ao buscar turmas:', error);
        res.status(500).json({ 
            error: 'Erro ao buscar turmas',
            details: error.message
        });
    }
};

/**
 * Busca uma turma por ID ou código
 */
export const getClassById = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        
        // Tenta buscar por ID primeiro, depois por código
        let classData = await prisma.class.findUnique({ where: { id } });
        
        if (!classData) {
            classData = await prisma.class.findUnique({ where: { codigo: id } });
        }
        
        if (!classData) {
            return res.status(404).json({ error: 'Turma não encontrada' });
        }
        
        res.json(classData);
    } catch (error: any) {
        console.error('❌ Erro ao buscar turma:', error);
        res.status(500).json({ 
            error: 'Erro ao buscar turma',
            details: error.message
        });
    }
};

/**
 * Cria uma nova turma
 */
export const createClass = async (req: Request, res: Response) => {
    try {
        const { codigo, nome, serie, turno, salaFixa, qtdAlunos } = req.body;
        
        // Validações
        if (!codigo || typeof codigo !== 'string') {
            return res.status(400).json({ error: 'Código é obrigatório (ex: 6A, 7B)' });
        }
        if (!serie || typeof serie !== 'number' || serie < 1 || serie > 12) {
            return res.status(400).json({ error: 'Série é obrigatória (1-12)' });
        }
        
        // Verificar se código já existe
        const existing = await prisma.class.findUnique({ where: { codigo } });
        if (existing) {
            return res.status(400).json({ error: 'Já existe uma turma com este código' });
        }
        
        console.log(`🎓 Criando turma: ${codigo}`);
        
        const classData = await prisma.class.create({
            data: {
                codigo,
                nome: nome || `${serie}º Ano ${codigo.slice(-1)}`,
                serie,
                turno: turno || 'manha',
                salaFixa: salaFixa || null,
                qtdAlunos: qtdAlunos || 0
            }
        });
        
        console.log(`✅ Turma criada: ${classData.id}`);
        res.status(201).json(classData);
    } catch (error: any) {
        console.error('❌ Erro ao criar turma:', error);
        
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Código de turma já existe' });
        }
        
        res.status(500).json({ 
            error: 'Erro ao criar turma',
            details: error.message
        });
    }
};

/**
 * Atualiza uma turma
 */
export const updateClass = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { codigo, nome, serie, turno, salaFixa, qtdAlunos, ativo } = req.body;
        
        // Verificar se turma existe
        const existing = await prisma.class.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ error: 'Turma não encontrada' });
        }
        
        // Se código mudou, verificar duplicidade
        if (codigo && codigo !== existing.codigo) {
            const duplicate = await prisma.class.findUnique({ where: { codigo } });
            if (duplicate) {
                return res.status(400).json({ error: 'Já existe uma turma com este código' });
            }
        }
        
        console.log(`🔄 Atualizando turma ${id}`);
        
        const classData = await prisma.class.update({
            where: { id },
            data: {
                codigo: codigo ?? existing.codigo,
                nome: nome ?? existing.nome,
                serie: serie ?? existing.serie,
                turno: turno ?? existing.turno,
                salaFixa: salaFixa !== undefined ? salaFixa : existing.salaFixa,
                qtdAlunos: qtdAlunos ?? existing.qtdAlunos,
                ativo: ativo !== undefined ? ativo : existing.ativo
            }
        });
        
        console.log(`✅ Turma atualizada: ${classData.codigo}`);
        res.json(classData);
    } catch (error: any) {
        console.error('❌ Erro ao atualizar turma:', error);
        res.status(500).json({ 
            error: 'Erro ao atualizar turma',
            details: error.message
        });
    }
};

/**
 * Deleta uma turma
 */
export const deleteClass = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        
        // Verificar se turma existe
        const classData = await prisma.class.findUnique({ where: { id } });
        if (!classData) {
            return res.status(404).json({ error: 'Turma não encontrada' });
        }
        
        // Verificar se há alocações ou aulas usando esta turma
        const allocationsCount = await prisma.classAllocation.count({ 
            where: { classId: classData.codigo } 
        });
        
        if (allocationsCount > 0) {
            return res.status(400).json({ 
                error: `Não é possível deletar: turma está vinculada a ${allocationsCount} alocação(ões)`,
                code: 'CLASS_IN_USE'
            });
        }
        
        console.log(`🗑️ Deletando turma: ${classData.codigo}`);
        
        await prisma.class.delete({ where: { id } });
        
        console.log(`✅ Turma deletada`);
        res.json({ 
            success: true, 
            message: `Turma "${classData.codigo}" removida com sucesso` 
        });
    } catch (error: any) {
        console.error('❌ Erro ao deletar turma:', error);
        res.status(500).json({ 
            error: 'Erro ao deletar turma',
            details: error.message
        });
    }
};

/**
 * Gera turmas automaticamente para uma série
 */
export const generateClasses = async (req: Request, res: Response) => {
    try {
        const { serie, quantidade, turno, prefixo } = req.body;
        
        if (!serie || typeof serie !== 'number') {
            return res.status(400).json({ error: 'Série é obrigatória' });
        }
        if (!quantidade || typeof quantidade !== 'number' || quantidade < 1 || quantidade > 26) {
            return res.status(400).json({ error: 'Quantidade deve ser entre 1 e 26' });
        }
        
        console.log(`🎓 Gerando ${quantidade} turmas para o ${serie}º ano`);
        
        const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        const created: any[] = [];
        const errors: string[] = [];
        
        for (let i = 0; i < quantidade; i++) {
            const letra = letras[i];
            const codigo = prefixo ? `${prefixo}${serie}${letra}` : `${serie}${letra}`;
            
            try {
                const classData = await prisma.class.create({
                    data: {
                        codigo,
                        nome: `${serie}º Ano ${letra}`,
                        serie,
                        turno: turno || 'manha',
                        qtdAlunos: 0
                    }
                });
                created.push(classData);
            } catch (e: any) {
                if (e.code === 'P2002') {
                    errors.push(`Turma ${codigo} já existe`);
                } else {
                    errors.push(`Erro ao criar turma ${codigo}: ${e.message}`);
                }
            }
        }
        
        console.log(`✅ ${created.length} turmas criadas`);
        
        res.status(201).json({
            message: `${created.length} turmas criadas com sucesso`,
            created,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error: any) {
        console.error('❌ Erro ao gerar turmas:', error);
        res.status(500).json({ 
            error: 'Erro ao gerar turmas',
            details: error.message
        });
    }
};

/**
 * Obtém estatísticas das turmas
 */
export const getClassStats = async (req: Request, res: Response) => {
    try {
        const turmas = await prisma.class.findMany({
            where: { ativo: true }
        });
        
        const bySerieAndTurno = turmas.reduce((acc: any, t) => {
            const key = `${t.serie}-${t.turno}`;
            if (!acc[key]) {
                acc[key] = { serie: t.serie, turno: t.turno, count: 0, alunos: 0 };
            }
            acc[key].count++;
            acc[key].alunos += t.qtdAlunos;
            return acc;
        }, {});
        
        const stats = {
            total: turmas.length,
            totalAlunos: turmas.reduce((sum, t) => sum + t.qtdAlunos, 0),
            porSerie: Object.values(bySerieAndTurno),
            porTurno: {
                manha: turmas.filter(t => t.turno === 'manha').length,
                tarde: turmas.filter(t => t.turno === 'tarde').length,
                integral: turmas.filter(t => t.turno === 'integral').length
            }
        };
        
        res.json(stats);
    } catch (error: any) {
        console.error('❌ Erro ao buscar estatísticas:', error);
        res.status(500).json({ 
            error: 'Erro ao buscar estatísticas',
            details: error.message
        });
    }
};
