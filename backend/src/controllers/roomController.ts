import { Request, Response } from 'express';
import { prisma } from '../utils/prismaClient';

/**
 * Lista todas as salas
 */
export const getRooms = async (req: Request, res: Response) => {
    try {
        const tipo = req.query.tipo as string | undefined;
        const ativo = req.query.ativo as string | undefined;
        
        const where: any = {};
        if (tipo) where.tipo = tipo;
        if (ativo !== undefined) where.ativo = ativo === 'true';
        
        const rooms = await prisma.room.findMany({
            where,
            orderBy: [
                { tipo: 'asc' },
                { nome: 'asc' }
            ]
        });
        
        res.json(rooms);
    } catch (error: any) {
        console.error('❌ Erro ao buscar salas:', error);
        res.status(500).json({ 
            error: 'Erro ao buscar salas',
            details: error.message
        });
    }
};

/**
 * Busca uma sala por ID
 */
export const getRoomById = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        
        const room = await prisma.room.findUnique({
            where: { id },
            include: {
                lessons: {
                    take: 10,
                    orderBy: { day: 'asc' }
                }
            }
        });
        
        if (!room) {
            return res.status(404).json({ error: 'Sala não encontrada' });
        }
        
        res.json(room);
    } catch (error: any) {
        console.error('❌ Erro ao buscar sala:', error);
        res.status(500).json({ 
            error: 'Erro ao buscar sala',
            details: error.message
        });
    }
};

/**
 * Cria uma nova sala
 */
export const createRoom = async (req: Request, res: Response) => {
    try {
        const { nome, codigo, tipo, capacidade, bloco, andar, recursos } = req.body;
        
        // Validações
        if (!nome || typeof nome !== 'string') {
            return res.status(400).json({ error: 'Nome é obrigatório' });
        }
        if (!codigo || typeof codigo !== 'string') {
            return res.status(400).json({ error: 'Código é obrigatório' });
        }
        
        // Verificar se código já existe
        const existing = await prisma.room.findUnique({ where: { codigo } });
        if (existing) {
            return res.status(400).json({ error: 'Já existe uma sala com este código' });
        }
        
        console.log(`🏫 Criando sala: ${nome} (${codigo})`);
        
        const room = await prisma.room.create({
            data: {
                nome,
                codigo,
                tipo: tipo || 'sala',
                capacidade: capacidade || 40,
                bloco: bloco || null,
                andar: andar || null,
                recursos: recursos || []
            }
        });
        
        console.log(`✅ Sala criada: ${room.id}`);
        res.status(201).json(room);
    } catch (error: any) {
        console.error('❌ Erro ao criar sala:', error);
        
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Código de sala já existe' });
        }
        
        res.status(500).json({ 
            error: 'Erro ao criar sala',
            details: error.message
        });
    }
};

/**
 * Atualiza uma sala
 */
export const updateRoom = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { nome, codigo, tipo, capacidade, bloco, andar, recursos, ativo } = req.body;
        
        // Verificar se sala existe
        const existing = await prisma.room.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ error: 'Sala não encontrada' });
        }
        
        // Se código mudou, verificar duplicidade
        if (codigo && codigo !== existing.codigo) {
            const duplicate = await prisma.room.findUnique({ where: { codigo } });
            if (duplicate) {
                return res.status(400).json({ error: 'Já existe uma sala com este código' });
            }
        }
        
        console.log(`🔄 Atualizando sala ${id}`);
        
        const room = await prisma.room.update({
            where: { id },
            data: {
                nome: nome ?? existing.nome,
                codigo: codigo ?? existing.codigo,
                tipo: tipo ?? existing.tipo,
                capacidade: capacidade ?? existing.capacidade,
                bloco: bloco !== undefined ? bloco : existing.bloco,
                andar: andar !== undefined ? andar : existing.andar,
                recursos: recursos ?? existing.recursos,
                ativo: ativo !== undefined ? ativo : existing.ativo
            }
        });
        
        console.log(`✅ Sala atualizada: ${room.nome}`);
        res.json(room);
    } catch (error: any) {
        console.error('❌ Erro ao atualizar sala:', error);
        res.status(500).json({ 
            error: 'Erro ao atualizar sala',
            details: error.message
        });
    }
};

/**
 * Deleta uma sala
 */
export const deleteRoom = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        
        // Verificar se sala existe
        const room = await prisma.room.findUnique({ where: { id } });
        if (!room) {
            return res.status(404).json({ error: 'Sala não encontrada' });
        }
        
        // Verificar se há aulas usando esta sala
        const lessonsCount = await prisma.lesson.count({ where: { roomId: id } });
        if (lessonsCount > 0) {
            return res.status(400).json({ 
                error: `Não é possível deletar: sala possui ${lessonsCount} aulas agendadas`,
                code: 'ROOM_IN_USE'
            });
        }
        
        console.log(`🗑️ Deletando sala: ${room.nome}`);
        
        await prisma.room.delete({ where: { id } });
        
        console.log(`✅ Sala deletada`);
        res.json({ 
            success: true, 
            message: `Sala "${room.nome}" removida com sucesso` 
        });
    } catch (error: any) {
        console.error('❌ Erro ao deletar sala:', error);
        res.status(500).json({ 
            error: 'Erro ao deletar sala',
            details: error.message
        });
    }
};

/**
 * Verifica disponibilidade de uma sala
 */
export const checkRoomAvailability = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const dia = req.query.dia as string | undefined;
        const horario = req.query.horario as string | undefined;
        
        const room = await prisma.room.findUnique({ where: { id } });
        if (!room) {
            return res.status(404).json({ error: 'Sala não encontrada' });
        }
        
        // Busca grade ativa
        const schedule = await prisma.schedule.findFirst({
            orderBy: { createdAt: 'desc' },
            where: { active: true }
        });
        
        if (!schedule) {
            return res.json({ disponivel: true, message: 'Nenhuma grade ativa' });
        }
        
        // Verifica ocupação
        const where: any = {
            scheduleId: schedule.id,
            roomId: id
        };
        
        if (dia !== undefined) where.day = Number(dia);
        if (horario !== undefined) where.timeSlot = Number(horario);
        
        const lessons = await prisma.lesson.findMany({
            where,
            orderBy: [{ day: 'asc' }, { timeSlot: 'asc' }]
        });
        
        if (dia !== undefined && horario !== undefined) {
            res.json({
                disponivel: lessons.length === 0,
                ocupacao: lessons.length > 0 ? lessons[0] : null
            });
        } else {
            // Retorna todas as ocupações da sala
            const ocupacoes: any = {};
            for (let d = 0; d < 5; d++) {
                ocupacoes[d] = {};
                for (let s = 0; s < 7; s++) {
                    ocupacoes[d][s] = null;
                }
            }
            
            lessons.forEach(l => {
                ocupacoes[l.day][l.timeSlot] = {
                    subject: l.subject,
                    classId: l.classId,
                    teacherId: l.teacherId
                };
            });
            
            res.json({
                sala: room,
                ocupacoes
            });
        }
    } catch (error: any) {
        console.error('❌ Erro ao verificar disponibilidade:', error);
        res.status(500).json({ 
            error: 'Erro ao verificar disponibilidade',
            details: error.message
        });
    }
};

/**
 * Lista tipos de sala disponíveis
 */
export const getRoomTypes = async (req: Request, res: Response) => {
    try {
        const types = await prisma.room.groupBy({
            by: ['tipo'],
            _count: { tipo: true }
        });
        
        const tiposBase = [
            { tipo: 'sala', descricao: 'Sala de Aula' },
            { tipo: 'laboratorio', descricao: 'Laboratório' },
            { tipo: 'quadra', descricao: 'Quadra/Ginásio' },
            { tipo: 'auditorio', descricao: 'Auditório' },
            { tipo: 'biblioteca', descricao: 'Biblioteca' }
        ];
        
        const result = tiposBase.map(t => ({
            ...t,
            count: types.find(x => x.tipo === t.tipo)?._count.tipo || 0
        }));
        
        res.json(result);
    } catch (error: any) {
        console.error('❌ Erro ao buscar tipos:', error);
        res.status(500).json({ 
            error: 'Erro ao buscar tipos de sala',
            details: error.message
        });
    }
};
