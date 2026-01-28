// @ts-ignore
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../utils/prismaClient';

// Helper types
type ClassId = string;
type SubjectName = string;

interface LessonAlloc {
    id: string;
    teacherId: string;
    subject: SubjectName;
    classId: ClassId;
}

interface TeacherWithAlloc {
    id: string;
    name: string;
    allocations: {
        subject: string;
        lessonsPerWeek: number;
        classes: { classId: string }[]
    }[];
}

interface DistributionItem {
    disciplina: string;
    turma: string;
    aulasPorSemana: number;
}

// CONFIGURAÇÃO - TEMPO INTEGRAL
const AULAS_POR_DIA: Record<number, number> = {
    0: 7, // Segunda
    1: 7, // Terça
    2: 7, // Quarta
    3: 7, // Quinta
    4: 6, // Sexta (sem 7ª aula - termina 14h20)
};

// Total máximo: 7+7+7+7+6 = 34 aulas/semana
const MAX_SLOTS_SEMANA = 34;

// 3D Matrix
const createEmptyGrid = () => {
    const grid: any = {};
    for (let d = 0; d < 5; d++) {
        grid[d] = {};
        const aulasNesteDia = AULAS_POR_DIA[d];
        for (let s = 0; s < aulasNesteDia; s++) {
            grid[d][s] = {};
        }
    }
    return grid;
};

// --- CHECK FUNCTIONS ---
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

const hasTooManyConsecutive = (
    grid: any,
    day: number,
    slot: number,
    classId: string,
    subject: string,
    maxConsecutive: number = 2
): boolean => {
    let count = 1; // Current lesson being placed

    // Check previous slots
    for (let s = slot - 1; s >= 0; s--) {
        if (grid[day]?.[s]?.[classId]?.subject === subject) {
            count++;
        } else {
            break;
        }
    }

    // Check next slots (if any were pre-filled, though usually we fill sequentially or randomly)
    // But since we fill randomly, we must check both directions just in case
    const maxSlots = AULAS_POR_DIA[day];
    for (let s = slot + 1; s < maxSlots; s++) {
        if (grid[day]?.[s]?.[classId]?.subject === subject) {
            count++;
        } else {
            break;
        }
    }

    return count > maxConsecutive;
};

// --- HELPER FUNCTIONS FOR SMART LOGIC ---

function shuffle(array: any[]) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function calcularTotalAulas(professores: TeacherWithAlloc[]) {
    return professores.reduce((acc, prof) => {
        return acc + prof.allocations.reduce((acc2, alloc) => {
            return acc2 + (alloc.lessonsPerWeek * alloc.classes.length);
        }, 0);
    }, 0);
}

function calcularTaxaSucesso(allocatedCount: number, totalNeeded: number) {
    if (totalNeeded === 0) return 100;
    return (allocatedCount / totalNeeded) * 100;
}

function encontrarAulasNaoAlocadas(allocatedLessons: any[], teachers: TeacherWithAlloc[]) {
    // Map of what happened
    const allocatedKeys = new Set(
        allocatedLessons.map(a => `${a.teacherId}-${a.subject}-${a.classId}`)
        // Note: Logic is tricky because multiple lessons same subject/class/teacher.
        // We need to count them.
    );

    // Better strategy: Count needed vs Count allocated
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


// --- SMART GENERATOR ---

const tentarGerarGrade = (teachers: TeacherWithAlloc[]) => {
    const grid = createEmptyGrid();
    const allocatedLessons: any[] = [];

    let lessonsToAllocate: LessonAlloc[] = [];

    teachers.forEach(t => {
        t.allocations.forEach(a => {
            // Priority Shuffle: Shuffle classes for each allocation
            const shuffledClasses = shuffle(a.classes);
            shuffledClasses.forEach((c: { classId: string }) => {
                for (let i = 0; i < a.lessonsPerWeek; i++) {
                    lessonsToAllocate.push({
                        id: uuidv4(),
                        teacherId: t.id,
                        subject: a.subject,
                        classId: c.classId
                    });
                }
            });
        });
    });

    // Shuffle critical:
    lessonsToAllocate = shuffle(lessonsToAllocate);

    // Generate all possible slots (respecting Fri limit)
    const allSlots: { day: number, slot: number }[] = [];
    for (let d = 0; d < 5; d++) {
        const maxSlots = AULAS_POR_DIA[d];
        for (let s = 0; s < maxSlots; s++) {
            allSlots.push({ day: d, slot: s });
        }
    }

    // Sort lessons by difficulty? (Teachers with most lessons first? Or classes with most lessons?)
    // For now, keep the random shuffle of lessons but improve the PLACEMENT strategy.

    for (const req of lessonsToAllocate) {
        let allocated = false;

        // Strategy: Shuffle all slots, then try them one by one until fit.
        // This guarantees we find a spot if it exists at this moment.
        const shuffledSlots = shuffle(allSlots); // Shuffle slots for this specific lesson attempt

        for (const { day, slot } of shuffledSlots) {
            // Check constraints
            if (!isClassBusy(grid, day, slot, req.classId) &&
                !isTeacherBusy(grid, day, slot, req.teacherId) &&
                !hasTooManyConsecutive(grid, day, slot, req.classId, req.subject, 2)) {

                // ALLOCATE
                if (!grid[day]) grid[day] = {};
                if (!grid[day][slot]) grid[day][slot] = {};

                const lessonObj = {
                    teacherId: req.teacherId,
                    subject: req.subject,
                    classId: req.classId,
                    day,
                    timeSlot: slot
                };

                grid[day][slot][req.classId] = lessonObj;
                allocatedLessons.push(lessonObj);
                allocated = true;
                break; // Stop looking for slots for this lesson
            }
        }

        // If loop finishes and allocated is false, it means NO slot was available for this lesson given current grid state.
    }

    return { grid, allocatedLessons };
};


// --- VALIDATION LOGIC ---
const validateWorkload = (teachers: TeacherWithAlloc[]): { valid: boolean; error?: string } => {
    // Limite real: 33 aulas (não 35!)
    const MAX_SLOTS = MAX_SLOTS_SEMANA;

    for (const t of teachers) {
        let totalLessons = 0;
        t.allocations.forEach(a => {
            totalLessons += a.lessonsPerWeek * a.classes.length;
        });

        if (totalLessons > MAX_SLOTS) {
            return {
                valid: false,
                error: `Erro Crítico: O professor(a) "${t.name}" tem ${totalLessons} aulas cadastradas. O limite máximo semanal é ${MAX_SLOTS} (lembre: sexta só tem 5 aulas!). Reduza a carga horária.`
            };
        }
    }

    // Check Classes overload (optional but good)
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
                error: `Erro Crítico: A turma "${classId}" tem ${total} aulas cadastradas. O limite máximo semanal é ${MAX_SLOTS}. Verifique se adicionou disciplinas demais.`
            };
        }
    }

    return { valid: true };
};

export const generateScheduleLogic = async (teacherIds: string[]) => {
    // 1. Fetch data
    const teachersRaw = await prisma.teacher.findMany({
        where: { id: { in: teacherIds } },
        include: {
            allocations: {
                include: { classes: true }
            }
        }
    });

    // Cast or map to cleaner type
    const teachers: TeacherWithAlloc[] = teachersRaw.map(t => ({
        id: t.id,
        name: t.name,
        allocations: t.allocations.map(a => ({
            subject: a.subject,
            lessonsPerWeek: a.lessonsPerWeek,
            classes: a.classes.map(c => ({ classId: c.classId }))
        }))
    }));

    // 2. Validate Constraints
    const validation = validateWorkload(teachers);
    if (!validation.valid) {
        return { success: false, erro: validation.error };
    }


    const totalNecessario = calcularTotalAulas(teachers);
    if (totalNecessario === 0) return { success: true, warnings: ["Nenhuma aula para alocar."] };

    const MAX_TENTATIVAS = 100;
    let tentativa = 0;
    let melhorResultado = null;
    let maiorTaxaSucesso = 0;

    while (tentativa < MAX_TENTATIVAS) {
        // Shuffle teachers order slightly affects the 'lessonsToAllocate' creation order if strictly implemented, 
        // but our 'tentarGerarGrade' builds the full list then shuffles.
        // So just calling it is enough randomness.

        const resultado = tentarGerarGrade(teachers);
        const taxaSucesso = calcularTaxaSucesso(resultado.allocatedLessons.length, totalNecessario);

        if (taxaSucesso === 100) {
            // SUCCESS!
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

    // Process Result
    if (!melhorResultado) return { success: false, erro: "Falha crítica no algoritmo." };

    const naoAlocadas = encontrarAulasNaoAlocadas(melhorResultado.allocatedLessons, teachers);
    const taxaFinal = maiorTaxaSucesso; // Fix logic

    if (taxaFinal >= 80) {
        // Save Best
        const scheduleRecord = await prisma.schedule.create({ data: { active: true } });

        if (melhorResultado.allocatedLessons.length > 0) {
            await prisma.lesson.createMany({
                data: melhorResultado.allocatedLessons.map((l: any) => ({
                    scheduleId: scheduleRecord.id,
                    teacherId: l.teacherId,
                    subject: l.subject,
                    classId: l.classId,
                    day: l.day,
                    timeSlot: l.timeSlot
                }))
            });
        }

        const avisos: string[] = [];
        if (taxaFinal < 100) {
            avisos.push(`⚠️ Não foi possível alocar 100% das aulas (${taxaFinal.toFixed(1)}% alocado).`);
            avisos.push(`Aulas não alocadas: ${naoAlocadas.length}`);
            avisos.push(`Você pode editar manualmente ou tentar "Reembaralhar" novamente.`);
        }

        return {
            success: true,
            scheduleId: scheduleRecord.id,
            grid: melhorResultado.grid,
            avisos,
            naoAlocadas
        };

    } else {
        // Failure
        const problematicos = identificarProfessoresProblematicos(teachers, naoAlocadas);
        const report = `❌ IMPOSSÍVEL ALOCAR OS PROFESSORES!
    
📊 ANÁLISE:
- Total de aulas necessárias: ${totalNecessario}
- Horários disponíveis: 5 dias x 7 slots x 20 turmas = 700 slots (aprox)
- Taxa máxima alcançada: ${taxaFinal.toFixed(1)}%

💡 SOLUÇÕES:
1. Reduza a carga horária de alguns professores
2. Reduza o número de turmas por disciplina
3. Adicione mais professores para dividir as aulas

🔧 Professores com mais conflitos:
${problematicos.slice(0, 3).map(p => `- ${p.nome}: ${p.aulasFaltando} aulas não alocadas`).join('\n')}
`;
        return {
            success: false,
            erro: report
        };
    }
};
