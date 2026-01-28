import type { SubjectName, Teacher } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Turmas disponíveis
const TURMAS: string[] = [
    '6A', '6B', '6C', '6D', '6E',
    '7A', '7B', '7C', '7D', '7E',
    '8A', '8B', '8C', '8D',
    '9A', '9B', '9C', '9D'
];

const MAX_AULAS_SEMANA = 34;
const SEMANAS_POR_MES = 4;
const DURACAO_AULA_MINUTOS = 50;

const DISCIPLINAS_CONFIG: Record<string, { sigla: string; aulasSemana: number }> = {
    'Português': { sigla: 'LP', aulasSemana: 5 },
    'Matemática': { sigla: 'MT', aulasSemana: 5 },
    'História': { sigla: 'HIST', aulasSemana: 3 },
    'Geografia': { sigla: 'GF', aulasSemana: 3 },
    'Ciências': { sigla: 'CFB', aulasSemana: 3 },
    'Educação Física': { sigla: 'E.FIS', aulasSemana: 2 },
    'Inglês': { sigla: 'ING', aulasSemana: 2 },
    'Artes': { sigla: 'ARTE', aulasSemana: 2 },
    'Educação Digital': { sigla: 'ED.D', aulasSemana: 2 },
    'Educação Financeira': { sigla: 'E.FIN', aulasSemana: 1 },
    'Educação Ambiental': { sigla: 'EAMB', aulasSemana: 1 },
    'Ensino Religioso': { sigla: 'E.R', aulasSemana: 1 },
    'Projeto de Vida': { sigla: 'P.V', aulasSemana: 1 },
    'Estudo Orientado': { sigla: 'E.OR', aulasSemana: 1 },
};

export const SCHOOL_CONFIG = {
    TURMAS,
    MAX_AULAS_SEMANA,
    DISCIPLINAS: DISCIPLINAS_CONFIG,
    TOTAL_TURMAS: TURMAS.length,
};

function getAulasPorSemana(disciplina: string): number {
    return DISCIPLINAS_CONFIG[disciplina]?.aulasSemana || 2;
}

function calcularCapacidadeSemanal(cargaHorariaMensal: number): number {
    const horasSemanais = cargaHorariaMensal / SEMANAS_POR_MES;
    const aulasCalculadas = Math.floor((horasSemanais * 60) / DURACAO_AULA_MINUTOS);
    return Math.min(aulasCalculadas, MAX_AULAS_SEMANA);
}

interface DistribuicaoItem {
    disciplina: string;
    turmas: string[];
    aulasPorSemana: number;
}

interface AutoDistributorInput {
    name: string;
    workloadMonthly: number;
    subjects: SubjectName[];
    // NOVO: Receber turmas já ocupadas por disciplina
    occupiedClasses?: Map<string, Set<string>>;
    // NOVO: Turmas permitidas para este professor (se vazio/undefined, permite todas)
    allowedClasses?: string[];
}

interface AutoDistributorResult {
    teacher: Teacher;
    distribuicao: DistribuicaoItem[];
    warning?: string;
    stats: {
        aulasSemanaisTotal: number;
        capacidadeMaxima: number;
        percentualOcupacao: number;
    };
}

/**
 * Embaralha um array usando algoritmo Fisher-Yates
 */
function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Agrupa turmas por série (6º, 7º, 8º, 9º)
 */
function agruparPorSerie(turmas: string[]): Map<string, string[]> {
    const grupos = new Map<string, string[]>();

    turmas.forEach(turma => {
        const serie = turma.charAt(0); // '6', '7', '8', '9'
        if (!grupos.has(serie)) {
            grupos.set(serie, []);
        }
        grupos.get(serie)!.push(turma);
    });

    return grupos;
}

/**
 * Cria lista round-robin: uma turma de cada série por rodada
 * Exemplo: [6A, 7A, 8A, 9A, 6B, 7B, 8B, 9B, 6C, 7C, 8C, 9C, ...]
 */
function criarListaRoundRobin(turmas: string[]): string[] {
    const grupos = agruparPorSerie(turmas);
    const resultado: string[] = [];

    // Embaralha turmas DENTRO de cada série
    grupos.forEach((turmasSerie, serie) => {
        grupos.set(serie, shuffleArray(turmasSerie));
    });

    // Pega o número máximo de turmas em qualquer série
    const maxTurmas = Math.max(...Array.from(grupos.values()).map(arr => arr.length));

    // Para cada posição (A, B, C, D, E)
    for (let i = 0; i < maxTurmas; i++) {
        // Pega uma turma de cada série nessa posição
        ['6', '7', '8', '9'].forEach(serie => {
            const turmasSerie = grupos.get(serie) || [];
            if (i < turmasSerie.length) {
                resultado.push(turmasSerie[i]);
            }
        });
    }

    return resultado;
}

/**
 * REFATORADO: Distribui com round-robin entre séries e múltiplas disciplinas
 */
export function distributeAutomatically(input: AutoDistributorInput): AutoDistributorResult {
    const { name, workloadMonthly, subjects, occupiedClasses, allowedClasses } = input;

    const capacidadeMaxima = calcularCapacidadeSemanal(workloadMonthly);

    console.log(`📊 Professor: ${name}`);
    console.log(`   Capacidade: ${capacidadeMaxima} aulas/semana`);
    console.log(`   Disciplinas: ${subjects.join(', ')}`);
    if (allowedClasses && allowedClasses.length > 0) {
        console.log(`   🔒 Restrição: Apenas turmas [${allowedClasses.join(', ')}]`);
    }

    const distribuicao: DistribuicaoItem[] = [];
    let aulasAlocadas = 0;
    const warnings: string[] = [];

    // Define turmas base (todas ou apenas as permitidas)
    const turmasBase = allowedClasses && allowedClasses.length > 0 ? allowedClasses : TURMAS;

    // Calcula aulas por disciplina
    const aulasPorDisciplina = subjects.map(d => ({
        disciplina: d,
        aulasPorSemana: getAulasPorSemana(d)
    }));

    // Distribui capacidade para cada disciplina
    for (const { disciplina, aulasPorSemana } of aulasPorDisciplina) {
        // Filtrar turmas disponíveis (que não têm essa disciplina E estão nas permitidas)
        const turmasOcupadas = occupiedClasses?.get(disciplina) || new Set<string>();
        const turmasDisponiveis = turmasBase.filter(t => !turmasOcupadas.has(t));

        console.log(`   ${disciplina}: ${turmasDisponiveis.length} turmas disponíveis de ${TURMAS.length}`);

        if (turmasDisponiveis.length === 0) {
            warnings.push(`${disciplina} já tem professor em todas as turmas`);
            continue;
        }

        // Cria lista round-robin para distribuição justa entre séries
        const turmasRoundRobin = criarListaRoundRobin(turmasDisponiveis);

        // Calcula quantas turmas esse professor pode pegar dessa disciplina
        const capacidadeRestante = capacidadeMaxima - aulasAlocadas;
        const maxTurmasPossiveis = Math.floor(capacidadeRestante / aulasPorSemana);

        // Limita ao disponível
        const numTurmasAlocar = Math.min(maxTurmasPossiveis, turmasRoundRobin.length);

        const turmasAlocadas: string[] = [];

        // Aloca turmas usando round-robin (balanceado entre séries)
        for (let i = 0; i < numTurmasAlocar; i++) {
            turmasAlocadas.push(turmasRoundRobin[i]);
            aulasAlocadas += aulasPorSemana;
        }

        if (turmasAlocadas.length > 0) {
            distribuicao.push({
                disciplina,
                turmas: turmasAlocadas,
                aulasPorSemana
            });

            // Mostra distribuição por série
            const porSerie = agruparPorSerie(turmasAlocadas);
            const breakdown = Array.from(porSerie.entries())
                .map(([serie, turmas]) => `${serie}º(${turmas.length})`)
                .join(' ');

            console.log(`   → Alocadas ${turmasAlocadas.length} turmas: ${breakdown}`);
            console.log(`      Turmas: ${turmasAlocadas.join(', ')}`);
        } else if (capacidadeRestante > 0) {
            warnings.push(`${disciplina}: capacidade insuficiente (precisa ${aulasPorSemana}, tem ${capacidadeRestante})`);
        }
    }

    const color = `hsl(${Math.floor(Math.random() * 360)}, 70%, 80%)`;

    const teacher: Teacher = {
        id: uuidv4(),
        name,
        workloadMonthly,
        color,
        allocations: distribuicao.map(d => ({
            subject: d.disciplina,
            lessonsPerWeek: d.aulasPorSemana,
            classes: d.turmas
        }))
    };

    const stats = {
        aulasSemanaisTotal: aulasAlocadas,
        capacidadeMaxima,
        percentualOcupacao: capacidadeMaxima > 0 ? Math.round((aulasAlocadas / capacidadeMaxima) * 100) : 0
    };

    console.log(`   Total: ${aulasAlocadas}/${capacidadeMaxima} (${stats.percentualOcupacao}%)`);

    return {
        teacher,
        distribuicao,
        warning: warnings.length > 0 ? warnings.join('; ') : undefined,
        stats
    };
}

/**
 * Calcula quais turmas já têm cada disciplina ocupada
 */
export function getOccupiedClasses(teachers: Teacher[]): Map<string, Set<string>> {
    const occupied = new Map<string, Set<string>>();

    teachers.forEach(teacher => {
        teacher.allocations.forEach(allocation => {
            if (!occupied.has(allocation.subject)) {
                occupied.set(allocation.subject, new Set());
            }
            allocation.classes.forEach(classId => {
                occupied.get(allocation.subject)!.add(classId);
            });
        });
    });

    return occupied;
}

export function validateTeacherAllocation(allocations: { lessonsPerWeek: number; classes: string[] }[]): {
    valid: boolean;
    totalAulas: number;
    error?: string;
} {
    const totalAulas = allocations.reduce(
        (acc, a) => acc + (a.lessonsPerWeek * a.classes.length),
        0
    );

    if (totalAulas > MAX_AULAS_SEMANA) {
        return {
            valid: false,
            totalAulas,
            error: `Total de ${totalAulas} aulas excede o limite de ${MAX_AULAS_SEMANA}.`
        };
    }

    return { valid: true, totalAulas };
}
