import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../utils/prismaClient';

// =============================================
// TIPOS
// =============================================

type ClassId = string;
type SubjectName = string;

interface LessonAlloc {
    id: string;
    teacherId: string;
    subject: SubjectName;
    classId: ClassId;
    priority: number;  // Maior = mais difícil de alocar
}

interface RoomInfo {
    id: string;
    codigo: string;
    tipo: string;
    capacidade: number;
}

interface TeacherWithAlloc {
    id: string;
    name: string;
    allocations: {
        subject: string;
        lessonsPerWeek: number;
        classes: { classId: string }[]
    }[];
    preferences?: {
        turnoPreferido: string | null;
        maxAulasDia: number | null;
        maxAulasSemana: number | null;
        diasIndisponiveis: number[];
        horariosIndisponiveis: string[];
        evitarAulasConsecutivas: number;
    } | null;
}

interface ScheduleConfig {
    aulasPerDia: Record<number, number>;
    maxSlotsSemana: number;
    turnoManha: boolean;
    turnoTarde: boolean;
    manhaSlots: number;
    tardeSlots: number;
}

// =============================================
// CONFIGURAÇÃO DINÂMICA
// =============================================

const getScheduleConfig = async (): Promise<ScheduleConfig> => {
    const config = await prisma.schoolConfig.findFirst();
    
    if (!config) {
        // Config padrão (tempo integral)
        return {
            aulasPerDia: { 0: 7, 1: 7, 2: 7, 3: 7, 4: 6 },
            maxSlotsSemana: 34,
            turnoManha: true,
            turnoTarde: true,
            manhaSlots: 6,
            tardeSlots: 5
        };
    }
    
    const manhaSlots = config.maxAulasManha;
    const tardeSlots = config.maxAulasTarde;
    
    // Calcular slots por dia baseado na configuração
    const aulasPerDia: Record<number, number> = {};
    for (let d = 0; d < 5; d++) {
        // Verificar se o dia está ativo
        const diaAtivo = (config.diasFuncionamento & (1 << d)) !== 0;
        if (!diaAtivo) {
            aulasPerDia[d] = 0;
            continue;
        }
        
        if (config.turnoIntegral) {
            // Sexta tem menos aulas
            aulasPerDia[d] = d === 4 ? manhaSlots + tardeSlots - 1 : manhaSlots + tardeSlots;
        } else if (config.turnoManha && config.turnoTarde) {
            aulasPerDia[d] = d === 4 ? manhaSlots : manhaSlots;
        } else if (config.turnoManha) {
            aulasPerDia[d] = manhaSlots;
        } else {
            aulasPerDia[d] = tardeSlots;
        }
    }
    
    const maxSlotsSemana = Object.values(aulasPerDia).reduce((a, b) => a + b, 0);
    
    return {
        aulasPerDia,
        maxSlotsSemana,
        turnoManha: config.turnoManha,
        turnoTarde: config.turnoTarde,
        manhaSlots,
        tardeSlots
    };
};

// =============================================
// FUNÇÕES AUXILIARES
// =============================================

const createEmptyGrid = (config: ScheduleConfig) => {
    const grid: any = {};
    for (let d = 0; d < 5; d++) {
        grid[d] = {};
        const aulasNesteDia = config.aulasPerDia[d];
        for (let s = 0; s < aulasNesteDia; s++) {
            grid[d][s] = {};
        }
    }
    return grid;
};

function shuffle<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// =============================================
// VERIFICAÇÕES DE RESTRIÇÕES
// =============================================

const isClassBusy = (grid: any, day: number, slot: number, classId: string): boolean => {
    return !!grid[day]?.[slot]?.[classId];
};

const isTeacherBusy = (grid: any, day: number, slot: number, teacherId: string): boolean => {
    const classesAtSlot = grid[day]?.[slot];
    if (!classesAtSlot) return false;
    for (const cId in classesAtSlot) {
        if (classesAtSlot[cId]?.teacherId === teacherId) return true;
    }
    return false;
};

/**
 * Verifica se uma sala está ocupada em determinado horário
 */
const isRoomBusy = (grid: any, day: number, slot: number, roomId: string): boolean => {
    const classesAtSlot = grid[day]?.[slot];
    if (!classesAtSlot) return false;
    for (const cId in classesAtSlot) {
        if (classesAtSlot[cId]?.roomId === roomId) return true;
    }
    return false;
};

/**
 * Encontra uma sala disponível para o horário
 * Prioriza salas do tipo adequado para a disciplina
 */
const findAvailableRoom = (
    grid: any,
    day: number,
    slot: number,
    subject: string,
    rooms: RoomInfo[]
): RoomInfo | null => {
    // Mapear disciplinas para tipos de sala preferidos
    const subjectRoomPreference: Record<string, string[]> = {
        'Informática': ['laboratorio'],
        'Computação': ['laboratorio'],
        'Tecnologia': ['laboratorio'],
        'Educação Física': ['quadra'],
        'Ed. Física': ['quadra'],
        'Música': ['auditorio', 'sala'],
        'Teatro': ['auditorio', 'sala'],
        'Ciências': ['laboratorio', 'sala'],
        'Química': ['laboratorio', 'sala'],
        'Física': ['laboratorio', 'sala'],
        'Biologia': ['laboratorio', 'sala'],
    };

    const preferredTypes = subjectRoomPreference[subject] || ['sala'];
    
    // Primeiro, tentar salas do tipo preferido
    for (const tipo of preferredTypes) {
        const roomsOfType = rooms.filter(r => r.tipo === tipo);
        for (const room of roomsOfType) {
            if (!isRoomBusy(grid, day, slot, room.id)) {
                return room;
            }
        }
    }
    
    // Se não encontrou, tentar qualquer sala disponível
    for (const room of rooms) {
        if (!isRoomBusy(grid, day, slot, room.id)) {
            return room;
        }
    }
    
    return null; // Nenhuma sala disponível
};

/**
 * Verifica se excede o máximo de aulas consecutivas da mesma disciplina
 */
const hasTooManyConsecutive = (
    grid: any,
    day: number,
    slot: number,
    classId: string,
    subject: string,
    maxConsecutive: number = 2
): boolean => {
    let count = 1;

    // Verifica slots anteriores
    for (let s = slot - 1; s >= 0; s--) {
        if (grid[day]?.[s]?.[classId]?.subject === subject) {
            count++;
        } else {
            break;
        }
    }

    // Verifica slots posteriores
    for (let s = slot + 1; grid[day]?.[s]; s++) {
        if (grid[day][s][classId]?.subject === subject) {
            count++;
        } else {
            break;
        }
    }

    return count > maxConsecutive;
};

/**
 * Verifica se o professor está disponível neste horário (preferências)
 */
const isTeacherAvailable = (
    teacher: TeacherWithAlloc,
    day: number,
    slot: number,
    grid: any,
    config: ScheduleConfig
): boolean => {
    const prefs = teacher.preferences;
    if (!prefs) return true;

    // Verificar dias indisponíveis
    if (prefs.diasIndisponiveis?.includes(day)) {
        return false;
    }

    // Verificar horários específicos indisponíveis
    const slotKey = `${day}-${slot}`;
    if (prefs.horariosIndisponiveis?.includes(slotKey)) {
        return false;
    }

    // Verificar preferência de turno
    if (prefs.turnoPreferido) {
        const isMorning = slot < config.manhaSlots;
        if (prefs.turnoPreferido === 'manha' && !isMorning) {
            // Penalizar, mas não bloquear totalmente
            // (será tratado na priorização)
        }
        if (prefs.turnoPreferido === 'tarde' && isMorning) {
            // Penalizar, mas não bloquear totalmente
        }
    }

    return true;
};

/**
 * Conta aulas do professor no dia
 */
const countTeacherLessonsInDay = (grid: any, day: number, teacherId: string): number => {
    let count = 0;
    const slots = grid[day];
    if (!slots) return 0;

    for (const slot in slots) {
        for (const classId in slots[slot]) {
            if (slots[slot][classId]?.teacherId === teacherId) {
                count++;
            }
        }
    }
    return count;
};

/**
 * Verifica se professor já atingiu limite de aulas no dia
 */
const hasReachedDailyLimit = (
    teacher: TeacherWithAlloc,
    grid: any,
    day: number
): boolean => {
    const prefs = teacher.preferences;
    if (!prefs?.maxAulasDia) return false;

    const currentCount = countTeacherLessonsInDay(grid, day, teacher.id);
    return currentCount >= prefs.maxAulasDia;
};

/**
 * Conta aulas consecutivas do professor
 */
const countConsecutiveTeacherLessons = (
    grid: any,
    day: number,
    slot: number,
    teacherId: string
): number => {
    let count = 1;

    // Conta para trás
    for (let s = slot - 1; s >= 0; s--) {
        let found = false;
        for (const classId in grid[day]?.[s] || {}) {
            if (grid[day][s][classId]?.teacherId === teacherId) {
                count++;
                found = true;
                break;
            }
        }
        if (!found) break;
    }

    // Conta para frente
    for (let s = slot + 1; grid[day]?.[s]; s++) {
        let found = false;
        for (const classId in grid[day][s] || {}) {
            if (grid[day][s][classId]?.teacherId === teacherId) {
                count++;
                found = true;
                break;
            }
        }
        if (!found) break;
    }

    return count;
};

// =============================================
// CÁLCULOS E ESTATÍSTICAS
// =============================================

function calcularTotalAulas(professores: TeacherWithAlloc[]): number {
    return professores.reduce((acc, prof) => {
        return acc + prof.allocations.reduce((acc2, alloc) => {
            return acc2 + (alloc.lessonsPerWeek * alloc.classes.length);
        }, 0);
    }, 0);
}

function calcularTaxaSucesso(allocatedCount: number, totalNeeded: number): number {
    if (totalNeeded === 0) return 100;
    return (allocatedCount / totalNeeded) * 100;
}

function encontrarAulasNaoAlocadas(allocatedLessons: any[], teachers: TeacherWithAlloc[]) {
    const neededMap = new Map<string, number>();
    
    teachers.forEach(t => {
        t.allocations.forEach(a => {
            a.classes.forEach(c => {
                const key = `${t.id}-${a.subject}-${c.classId}`;
                const current = neededMap.get(key) || 0;
                neededMap.set(key, current + a.lessonsPerWeek);
            });
        });
    });

    allocatedLessons.forEach(l => {
        const key = `${l.teacherId}-${l.subject}-${l.classId}`;
        const current = neededMap.get(key);
        if (current && current > 0) {
            neededMap.set(key, current - 1);
        }
    });

    const naoAlocadas: any[] = [];
    neededMap.forEach((count, key) => {
        if (count > 0) {
            const [tid, subj, cid] = key.split('-');
            const tName = teachers.find(t => t.id === tid)?.name || tid;
            naoAlocadas.push({
                professor: tName,
                disciplina: subj,
                turma: cid,
                aulasFaltando: count
            });
        }
    });
    return naoAlocadas;
}

function identificarProfessoresProblematicos(teachers: TeacherWithAlloc[], naoAlocadas: any[]) {
    const problematicosMap = new Map<string, number>();

    naoAlocadas.forEach(item => {
        const current = problematicosMap.get(item.professor) || 0;
        problematicosMap.set(item.professor, current + item.aulasFaltando);
    });

    return Array.from(problematicosMap.entries())
        .map(([nome, aulasFaltando]) => ({ nome, aulasFaltando }))
        .sort((a, b) => b.aulasFaltando - a.aulasFaltando);
}

// =============================================
// GERADOR PRINCIPAL
// =============================================

const tentarGerarGrade = (
    teachers: TeacherWithAlloc[],
    config: ScheduleConfig,
    rooms: RoomInfo[] = []
) => {
    const grid = createEmptyGrid(config);
    const allocatedLessons: any[] = [];

    // Preparar lista de aulas para alocar com prioridade
    let lessonsToAllocate: LessonAlloc[] = [];

    teachers.forEach(t => {
        // Calcular prioridade base do professor (mais restrito = maior prioridade)
        let basePriority = 0;
        if (t.preferences) {
            basePriority += (t.preferences.diasIndisponiveis?.length || 0) * 10;
            basePriority += (t.preferences.horariosIndisponiveis?.length || 0) * 2;
            if (t.preferences.maxAulasDia) basePriority += 5;
        }

        t.allocations.forEach(a => {
            const shuffledClasses = shuffle(a.classes);
            shuffledClasses.forEach((c: { classId: string }) => {
                for (let i = 0; i < a.lessonsPerWeek; i++) {
                    lessonsToAllocate.push({
                        id: uuidv4(),
                        teacherId: t.id,
                        subject: a.subject,
                        classId: c.classId,
                        priority: basePriority + a.lessonsPerWeek // Mais aulas = mais difícil
                    });
                }
            });
        });
    });

    // Ordenar por prioridade (mais restrito primeiro) e depois embaralhar dentro da mesma prioridade
    lessonsToAllocate.sort((a, b) => b.priority - a.priority);

    // Criar mapa de professores para acesso rápido
    const teacherMap = new Map(teachers.map(t => [t.id, t]));

    // Gerar todos os slots possíveis
    const allSlots: { day: number, slot: number }[] = [];
    for (let d = 0; d < 5; d++) {
        const maxSlots = config.aulasPerDia[d];
        for (let s = 0; s < maxSlots; s++) {
            allSlots.push({ day: d, slot: s });
        }
    }

    // Alocar cada aula
    for (const req of lessonsToAllocate) {
        const teacher = teacherMap.get(req.teacherId)!;
        let allocated = false;
        
        // Priorizar slots baseado nas preferências do professor
        let prioritizedSlots = [...allSlots];
        
        if (teacher.preferences?.turnoPreferido === 'manha') {
            // Slots da manhã primeiro
            prioritizedSlots.sort((a, b) => a.slot - b.slot);
        } else if (teacher.preferences?.turnoPreferido === 'tarde') {
            // Slots da tarde primeiro
            prioritizedSlots.sort((a, b) => b.slot - a.slot);
        } else {
            // Shuffle normal
            prioritizedSlots = shuffle(prioritizedSlots);
        }

        for (const { day, slot } of prioritizedSlots) {
            // Verificar todas as restrições
            if (isClassBusy(grid, day, slot, req.classId)) continue;
            if (isTeacherBusy(grid, day, slot, req.teacherId)) continue;
            if (hasTooManyConsecutive(grid, day, slot, req.classId, req.subject, 2)) continue;
            if (!isTeacherAvailable(teacher, day, slot, grid, config)) continue;
            if (hasReachedDailyLimit(teacher, grid, day)) continue;

            // Verificar limite de aulas consecutivas do professor
            if (teacher.preferences?.evitarAulasConsecutivas) {
                const consecutive = countConsecutiveTeacherLessons(grid, day, slot, req.teacherId);
                if (consecutive >= teacher.preferences.evitarAulasConsecutivas) continue;
            }

            // Tentar alocar sala (opcional)
            let roomId: string | null = null;
            if (rooms.length > 0) {
                const room = findAvailableRoom(grid, day, slot, req.subject, rooms);
                if (room) {
                    roomId = room.id;
                }
                // Se não encontrou sala, ainda aloca a aula (sala será null)
            }

            // ALOCAR
            if (!grid[day]) grid[day] = {};
            if (!grid[day][slot]) grid[day][slot] = {};

            const lessonObj = {
                teacherId: req.teacherId,
                subject: req.subject,
                classId: req.classId,
                day,
                timeSlot: slot,
                roomId
            };

            grid[day][slot][req.classId] = lessonObj;
            allocatedLessons.push(lessonObj);
            allocated = true;
            break;
        }
    }

    return { grid, allocatedLessons };
};

// =============================================
// VALIDAÇÃO
// =============================================

const validateWorkload = (
    teachers: TeacherWithAlloc[],
    config: ScheduleConfig
): { valid: boolean; error?: string } => {
    const MAX_SLOTS = config.maxSlotsSemana;

    for (const t of teachers) {
        let totalLessons = 0;
        t.allocations.forEach(a => {
            totalLessons += a.lessonsPerWeek * a.classes.length;
        });

        // Verificar limite semanal
        if (totalLessons > MAX_SLOTS) {
            return {
                valid: false,
                error: `Erro: O professor(a) "${t.name}" tem ${totalLessons} aulas cadastradas. ` +
                       `O limite máximo semanal é ${MAX_SLOTS}. Reduza a carga horária.`
            };
        }

        // Verificar preferências de limite semanal
        if (t.preferences?.maxAulasSemana && totalLessons > t.preferences.maxAulasSemana) {
            return {
                valid: false,
                error: `Erro: O professor(a) "${t.name}" tem ${totalLessons} aulas cadastradas, ` +
                       `mas seu limite preferencial é ${t.preferences.maxAulasSemana} aulas/semana.`
            };
        }

        // Verificar se cabe nos dias disponíveis
        if (t.preferences?.diasIndisponiveis && t.preferences.diasIndisponiveis.length > 0) {
            const diasDisponiveis = 5 - t.preferences.diasIndisponiveis.length;
            const maxPorDia = t.preferences.maxAulasDia || 7;
            const capacidade = diasDisponiveis * maxPorDia;
            
            if (totalLessons > capacidade) {
                return {
                    valid: false,
                    error: `Erro: O professor(a) "${t.name}" tem ${totalLessons} aulas, mas só ` +
                           `pode dar ${capacidade} (${diasDisponiveis} dias × ${maxPorDia} aulas/dia).`
                };
            }
        }
    }

    // Verificar sobrecarga de turmas
    const classMap = new Map<string, number>();
    teachers.forEach(t => {
        t.allocations.forEach(a => {
            a.classes.forEach(c => {
                const current = classMap.get(c.classId) || 0;
                classMap.set(c.classId, current + a.lessonsPerWeek);
            });
        });
    });

    for (const [classId, total] of classMap.entries()) {
        if (total > MAX_SLOTS) {
            return {
                valid: false,
                error: `Erro: A turma "${classId}" tem ${total} aulas cadastradas. ` +
                       `O limite máximo semanal é ${MAX_SLOTS}.`
            };
        }
    }

    return { valid: true };
};

// =============================================
// FUNÇÃO PRINCIPAL EXPORTADA
// =============================================

export const generateScheduleLogic = async (teacherIds: string[]) => {
    // 1. Buscar configuração
    const config = await getScheduleConfig();
    
    // 2. Buscar salas disponíveis
    const roomsRaw = await prisma.room.findMany({
        where: { ativo: true },
        orderBy: [{ tipo: 'asc' }, { nome: 'asc' }]
    });
    
    const rooms: RoomInfo[] = roomsRaw.map(r => ({
        id: r.id,
        codigo: r.codigo,
        tipo: r.tipo,
        capacidade: r.capacidade
    }));
    
    console.log(`📍 ${rooms.length} salas disponíveis para alocação`);
    
    // 3. Buscar professores com preferências
    const teachersRaw = await prisma.teacher.findMany({
        where: { id: { in: teacherIds } },
        include: {
            allocations: {
                include: { classes: true }
            },
            preferences: true
        }
    });

    // Mapear para tipo limpo
    const teachers: TeacherWithAlloc[] = teachersRaw.map(t => ({
        id: t.id,
        name: t.name,
        allocations: t.allocations.map(a => ({
            subject: a.subject,
            lessonsPerWeek: a.lessonsPerWeek,
            classes: a.classes.map(c => ({ classId: c.classId }))
        })),
        preferences: t.preferences ? {
            turnoPreferido: t.preferences.turnoPreferido,
            maxAulasDia: t.preferences.maxAulasDia,
            maxAulasSemana: t.preferences.maxAulasSemana,
            diasIndisponiveis: t.preferences.diasIndisponiveis,
            horariosIndisponiveis: t.preferences.horariosIndisponiveis,
            evitarAulasConsecutivas: t.preferences.evitarAulasConsecutivas
        } : null
    }));

    // 3. Validar restrições
    const validation = validateWorkload(teachers, config);
    if (!validation.valid) {
        return { success: false, erro: validation.error };
    }

    const totalNecessario = calcularTotalAulas(teachers);
    if (totalNecessario === 0) {
        return { success: true, warnings: ["Nenhuma aula para alocar."] };
    }

    // 4. Tentar gerar grade múltiplas vezes
    const MAX_TENTATIVAS = 100;
    let tentativa = 0;
    let melhorResultado: any = null;
    let maiorTaxaSucesso = 0;

    while (tentativa < MAX_TENTATIVAS) {
        const resultado = tentarGerarGrade(teachers, config, rooms);
        const taxaSucesso = calcularTaxaSucesso(resultado.allocatedLessons.length, totalNecessario);

        if (taxaSucesso === 100) {
            melhorResultado = resultado;
            maiorTaxaSucesso = 100;
            break;
        }

        if (taxaSucesso > maiorTaxaSucesso) {
            melhorResultado = resultado;
            maiorTaxaSucesso = taxaSucesso;
        }

        tentativa++;
    }

    if (!melhorResultado) {
        return { success: false, erro: "Falha crítica no algoritmo." };
    }

    const naoAlocadas = encontrarAulasNaoAlocadas(melhorResultado.allocatedLessons, teachers);
    const taxaFinal = maiorTaxaSucesso;

    // 5. Salvar se taxa >= 80%
    if (taxaFinal >= 80) {
        const scheduleRecord = await prisma.schedule.create({ data: { active: true } });

        if (melhorResultado.allocatedLessons.length > 0) {
            await prisma.lesson.createMany({
                data: melhorResultado.allocatedLessons.map((l: any) => ({
                    scheduleId: scheduleRecord.id,
                    teacherId: l.teacherId,
                    subject: l.subject,
                    classId: l.classId,
                    day: l.day,
                    timeSlot: l.timeSlot,
                    roomId: l.roomId || null
                }))
            });
        }
        
        // Contar salas alocadas
        const aulasComSala = melhorResultado.allocatedLessons.filter((l: any) => l.roomId).length;

        const avisos: string[] = [];
        if (taxaFinal < 100) {
            avisos.push(`⚠️ Não foi possível alocar 100% das aulas (${taxaFinal.toFixed(1)}% alocado).`);
            avisos.push(`Aulas não alocadas: ${naoAlocadas.length}`);
            avisos.push(`Você pode editar manualmente ou tentar "Reembaralhar".`);
        }

        return {
            success: true,
            scheduleId: scheduleRecord.id,
            grid: melhorResultado.grid,
            avisos,
            naoAlocadas,
            estatisticas: {
                totalAulas: totalNecessario,
                alocadas: melhorResultado.allocatedLessons.length,
                taxaSucesso: taxaFinal.toFixed(1),
                tentativas: tentativa + 1,
                salasDisponiveis: rooms.length,
                aulasComSala: aulasComSala
            }
        };

    } else {
        // Falha - gerar relatório
        const problematicos = identificarProfessoresProblematicos(teachers, naoAlocadas);
        const report = `❌ IMPOSSÍVEL ALOCAR OS PROFESSORES!

📊 ANÁLISE:
- Total de aulas necessárias: ${totalNecessario}
- Taxa máxima alcançada: ${taxaFinal.toFixed(1)}%
- Tentativas realizadas: ${tentativa}

💡 SOLUÇÕES:
1. Reduza a carga horária de alguns professores
2. Reduza o número de turmas por disciplina
3. Verifique as preferências/restrições dos professores
4. Adicione mais professores para dividir as aulas

🔧 Professores com mais conflitos:
${problematicos.slice(0, 5).map(p => `- ${p.nome}: ${p.aulasFaltando} aulas não alocadas`).join('\n')}
`;
        return {
            success: false,
            erro: report,
            naoAlocadas,
            estatisticas: {
                totalAulas: totalNecessario,
                alocadas: melhorResultado.allocatedLessons.length,
                taxaSucesso: taxaFinal.toFixed(1),
                tentativas: tentativa
            }
        };
    }
};
