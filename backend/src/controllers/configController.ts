import { Request, Response } from 'express';
import { prisma } from '../utils/prismaClient';

/**
 * Obtém a configuração atual do sistema
 */
export const getConfig = async (req: Request, res: Response) => {
    try {
        let config = await prisma.schoolConfig.findFirst();
        
        // Se não existe configuração, criar uma padrão
        if (!config) {
            config = await prisma.schoolConfig.create({
                data: {}  // Usa os valores default do schema
            });
        }
        
        res.json(config);
    } catch (error: any) {
        console.error('❌ Erro ao buscar configuração:', error);
        res.status(500).json({ 
            error: 'Erro ao buscar configuração',
            details: error.message
        });
    }
};

/**
 * Atualiza a configuração do sistema
 */
export const updateConfig = async (req: Request, res: Response) => {
    try {
        const data = req.body;
        
        console.log('🔄 Atualizando configuração:', data);
        
        // Busca configuração existente
        let config = await prisma.schoolConfig.findFirst();
        
        if (config) {
            // Atualiza
            config = await prisma.schoolConfig.update({
                where: { id: config.id },
                data: {
                    turnoManha: data.turnoManha,
                    turnoTarde: data.turnoTarde,
                    turnoIntegral: data.turnoIntegral,
                    manhaInicio: data.manhaInicio,
                    manhaFim: data.manhaFim,
                    tardeInicio: data.tardeInicio,
                    tardeFim: data.tardeFim,
                    duracaoAula: data.duracaoAula,
                    recreioInicio: data.recreioInicio,
                    recreioDuracao: data.recreioDuracao,
                    recreioTardeInicio: data.recreioTardeInicio,
                    almocoInicio: data.almocoInicio,
                    almocoDuracao: data.almocoDuracao,
                    maxAulasManha: data.maxAulasManha,
                    maxAulasTarde: data.maxAulasTarde,
                    diasFuncionamento: data.diasFuncionamento
                }
            });
        } else {
            // Cria
            config = await prisma.schoolConfig.create({
                data: {
                    turnoManha: data.turnoManha ?? true,
                    turnoTarde: data.turnoTarde ?? true,
                    turnoIntegral: data.turnoIntegral ?? false,
                    manhaInicio: data.manhaInicio ?? "07:00",
                    manhaFim: data.manhaFim ?? "12:00",
                    tardeInicio: data.tardeInicio ?? "13:00",
                    tardeFim: data.tardeFim ?? "17:30",
                    duracaoAula: data.duracaoAula ?? 50,
                    recreioInicio: data.recreioInicio ?? "09:30",
                    recreioDuracao: data.recreioDuracao ?? 20,
                    recreioTardeInicio: data.recreioTardeInicio ?? "15:00",
                    almocoInicio: data.almocoInicio ?? "12:00",
                    almocoDuracao: data.almocoDuracao ?? 60,
                    maxAulasManha: data.maxAulasManha ?? 6,
                    maxAulasTarde: data.maxAulasTarde ?? 5,
                    diasFuncionamento: data.diasFuncionamento ?? 31
                }
            });
        }
        
        console.log('✅ Configuração atualizada');
        res.json(config);
    } catch (error: any) {
        console.error('❌ Erro ao atualizar configuração:', error);
        res.status(500).json({ 
            error: 'Erro ao atualizar configuração',
            details: error.message
        });
    }
};

/**
 * Obtém os time slots configurados
 */
export const getTimeSlots = async (req: Request, res: Response) => {
    try {
        const turno = req.query.turno as string | undefined;
        
        const where: any = { ativo: true };
        if (turno) where.turno = turno;
        
        const slots = await prisma.timeSlot.findMany({
            where,
            orderBy: [
                { turno: 'asc' },
                { ordem: 'asc' }
            ]
        });
        
        res.json(slots);
    } catch (error: any) {
        console.error('❌ Erro ao buscar time slots:', error);
        res.status(500).json({ 
            error: 'Erro ao buscar time slots',
            details: error.message
        });
    }
};

/**
 * Gera time slots automaticamente baseado na configuração
 */
export const generateTimeSlots = async (req: Request, res: Response) => {
    try {
        const config = await prisma.schoolConfig.findFirst();
        if (!config) {
            return res.status(400).json({ error: 'Configure o sistema primeiro' });
        }
        
        console.log('🔄 Gerando time slots baseado na configuração...');
        
        // Remove slots antigos
        await prisma.timeSlot.deleteMany({});
        
        const slots: any[] = [];
        
        // Helper para converter HH:MM em minutos
        const toMinutes = (time: string) => {
            const [h, m] = time.split(':').map(Number);
            return h * 60 + m;
        };
        
        // Helper para converter minutos em HH:MM
        const toTime = (minutes: number) => {
            const h = Math.floor(minutes / 60);
            const m = minutes % 60;
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        };
        
        // Gerar slots para turno da manhã
        if (config.turnoManha) {
            let currentTime = toMinutes(config.manhaInicio);
            const manhaFim = toMinutes(config.manhaFim);
            const recreioInicio = config.recreioInicio ? toMinutes(config.recreioInicio) : null;
            let ordem = 1;
            
            while (currentTime + config.duracaoAula <= manhaFim && ordem <= config.maxAulasManha) {
                // Verificar se é hora do recreio
                if (recreioInicio && currentTime === recreioInicio) {
                    slots.push({
                        ordem: ordem,
                        turno: 'manha',
                        horaInicio: toTime(currentTime),
                        horaFim: toTime(currentTime + config.recreioDuracao),
                        tipo: 'recreio'
                    });
                    currentTime += config.recreioDuracao;
                    ordem++;
                }
                
                slots.push({
                    ordem: ordem,
                    turno: 'manha',
                    horaInicio: toTime(currentTime),
                    horaFim: toTime(currentTime + config.duracaoAula),
                    tipo: 'aula'
                });
                
                currentTime += config.duracaoAula;
                ordem++;
            }
        }
        
        // Gerar slots para turno da tarde
        if (config.turnoTarde) {
            let currentTime = toMinutes(config.tardeInicio);
            const tardeFim = toMinutes(config.tardeFim);
            const recreioTardeInicio = config.recreioTardeInicio ? toMinutes(config.recreioTardeInicio) : null;
            let ordem = 1;
            
            while (currentTime + config.duracaoAula <= tardeFim && ordem <= config.maxAulasTarde) {
                // Verificar se é hora do recreio
                if (recreioTardeInicio && currentTime === recreioTardeInicio) {
                    slots.push({
                        ordem: ordem,
                        turno: 'tarde',
                        horaInicio: toTime(currentTime),
                        horaFim: toTime(currentTime + config.recreioDuracao),
                        tipo: 'recreio'
                    });
                    currentTime += config.recreioDuracao;
                    ordem++;
                }
                
                slots.push({
                    ordem: ordem,
                    turno: 'tarde',
                    horaInicio: toTime(currentTime),
                    horaFim: toTime(currentTime + config.duracaoAula),
                    tipo: 'aula'
                });
                
                currentTime += config.duracaoAula;
                ordem++;
            }
        }
        
        // Criar slots no banco
        if (slots.length > 0) {
            await prisma.timeSlot.createMany({ data: slots });
        }
        
        const created = await prisma.timeSlot.findMany({
            orderBy: [{ turno: 'asc' }, { ordem: 'asc' }]
        });
        
        console.log(`✅ ${created.length} time slots gerados`);
        res.json({
            message: `${created.length} horários gerados com sucesso`,
            slots: created
        });
    } catch (error: any) {
        console.error('❌ Erro ao gerar time slots:', error);
        res.status(500).json({ 
            error: 'Erro ao gerar time slots',
            details: error.message
        });
    }
};
