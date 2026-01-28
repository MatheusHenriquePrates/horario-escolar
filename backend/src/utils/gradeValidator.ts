import { prisma } from './prismaClient';

interface ValidationResult {
    valid: boolean;
    conflicts: Conflict[];
    warnings: Warning[];
    stats: Stats;
}

interface Conflict {
    type: 'teacher_double_booking' | 'class_double_booking' | 'consecutive_limit';
    severity: 'critical' | 'warning';
    description: string;
    details: any;
}

interface Warning {
    type: string;
    description: string;
}

interface Stats {
    totalLessons: number;
    teacherUtilization: Map<string, { used: number; capacity: number; percentage: number }>;
    subjectCoverage: Map<string, { covered: number; total: number; percentage: number }>;
    consecutiveViolations: number;
}

/**
 * 🔍 VALIDADOR COMPLETO DA GRADE
 * Verifica todos os conflitos e problemas possíveis
 */
export async function validateSchedule(): Promise<ValidationResult> {
    const conflicts: Conflict[] = [];
    const warnings: Warning[] = [];

    console.log('🔍 Iniciando validação da grade...\n');

    // Buscar dados
    const schedule = await prisma.schedule.findFirst({
        where: { active: true },
        include: { lessons: true }
    });

    const teachers = await prisma.teacher.findMany({
        include: {
            allocations: { include: { classes: true } }
        }
    });

    if (!schedule) {
        return {
            valid: false,
            conflicts: [{
                type: 'teacher_double_booking',
                severity: 'critical',
                description: 'Nenhuma grade ativa encontrada',
                details: {}
            }],
            warnings: [],
            stats: {
                totalLessons: 0,
                teacherUtilization: new Map(),
                subjectCoverage: new Map(),
                consecutiveViolations: 0
            }
        };
    }

    const lessons = schedule.lessons;
    console.log(`📊 Total de aulas na grade: ${lessons.length}\n`);

    // 1. CONFLITO: Professor em 2 lugares ao mesmo tempo
    console.log('🔎 Verificando conflitos de professores...');
    const teacherSlots = new Map<string, Set<string>>();

    for (const lesson of lessons) {
        const key = `${lesson.teacherId}-${lesson.day}-${lesson.timeSlot}`;
        const slotKey = `Dia ${lesson.day + 1}, Aula ${lesson.timeSlot + 1}`;

        if (!teacherSlots.has(lesson.teacherId)) {
            teacherSlots.set(lesson.teacherId, new Set());
        }

        if (teacherSlots.get(lesson.teacherId)!.has(`${lesson.day}-${lesson.timeSlot}`)) {
            const teacher = teachers.find(t => t.id === lesson.teacherId);
            conflicts.push({
                type: 'teacher_double_booking',
                severity: 'critical',
                description: `❌ CONFLITO CRÍTICO: Professor em 2 turmas ao mesmo tempo`,
                details: {
                    teacher: teacher?.name || lesson.teacherId,
                    slot: slotKey,
                    message: `${teacher?.name} está em 2 turmas simultaneamente em ${slotKey}`
                }
            });
        }

        teacherSlots.get(lesson.teacherId)!.add(`${lesson.day}-${lesson.timeSlot}`);
    }

    if (conflicts.length === 0) {
        console.log('   ✅ Nenhum conflito de professor encontrado!\n');
    } else {
        console.log(`   ❌ ${conflicts.length} conflitos de professor detectados\n`);
    }

    // 2. CONFLITO: Turma com 2 professores ao mesmo tempo
    console.log('🔎 Verificando conflitos de turmas...');
    const classSlots = new Map<string, string>();

    for (const lesson of lessons) {
        const key = `${lesson.classId}-${lesson.day}-${lesson.timeSlot}`;

        if (classSlots.has(key)) {
            const firstTeacher = teachers.find(t => t.id === classSlots.get(key));
            const secondTeacher = teachers.find(t => t.id === lesson.teacherId);

            conflicts.push({
                type: 'class_double_booking',
                severity: 'critical',
                description: `❌ CONFLITO CRÍTICO: Turma com 2 professores ao mesmo tempo`,
                details: {
                    class: lesson.classId,
                    slot: `Dia ${lesson.day + 1}, Aula ${lesson.timeSlot + 1}`,
                    teachers: [firstTeacher?.name, secondTeacher?.name],
                    message: `Turma ${lesson.classId} tem ${firstTeacher?.name} e ${secondTeacher?.name} no mesmo horário`
                }
            });
        }

        classSlots.set(key, lesson.teacherId);
    }

    if (conflicts.filter(c => c.type === 'class_double_booking').length === 0) {
        console.log('   ✅ Nenhum conflito de turma encontrado!\n');
    }

    // 3. VALIDAÇÃO: Máximo 2 aulas consecutivas da mesma disciplina
    console.log('🔎 Verificando regra de aulas consecutivas...');
    let consecutiveViolations = 0;

    // Agrupar por turma e dia
    const TURMAS = ['6A', '6B', '6C', '6D', '6E', '7A', '7B', '7C', '7D', '7E', '8A', '8B', '8C', '8D', '9A', '9B', '9C', '9D'];

    for (const turma of TURMAS) {
        for (let day = 0; day < 5; day++) {
            const dailyLessons = lessons
                .filter(l => l.classId === turma && l.day === day)
                .sort((a, b) => a.timeSlot - b.timeSlot);

            for (let i = 0; i < dailyLessons.length - 2; i++) {
                const current = dailyLessons[i];
                const next1 = dailyLessons[i + 1];
                const next2 = dailyLessons[i + 2];

                // Verifica se 3 aulas consecutivas são da mesma disciplina
                if (current && next1 && next2 &&
                    current.timeSlot === next1.timeSlot - 1 &&
                    next1.timeSlot === next2.timeSlot - 1 &&
                    current.subject === next1.subject &&
                    next1.subject === next2.subject) {

                    consecutiveViolations++;
                    warnings.push({
                        type: 'consecutive_limit',
                        description: `⚠️  ${turma} - Dia ${day + 1}: 3 aulas seguidas de ${current.subject} (aulas ${current.timeSlot + 1}-${next2.timeSlot + 1})`
                    });
                }
            }
        }
    }

    if (consecutiveViolations === 0) {
        console.log('   ✅ Regra de 2 aulas consecutivas respeitada!\n');
    } else {
        console.log(`   ⚠️  ${consecutiveViolations} violações da regra de aulas consecutivas\n`);
    }

    // 4. ESTATÍSTICAS: Utilização de professores
    console.log('📊 Calculando utilização de professores...');
    const teacherUtilization = new Map<string, { used: number; capacity: number; percentage: number }>();

    for (const teacher of teachers) {
        const capacity = Math.min(
            Math.floor((teacher.workloadMonthly / 4 * 60) / 50),
            34
        );

        const used = lessons.filter(l => l.teacherId === teacher.id).length;
        const percentage = capacity > 0 ? Math.round((used / capacity) * 100) : 0;

        teacherUtilization.set(teacher.name, {
            used,
            capacity,
            percentage
        });

        console.log(`   ${teacher.name}: ${used}/${capacity} aulas (${percentage}%)`);
    }
    console.log();

    // 5. ESTATÍSTICAS: Cobertura de disciplinas
    console.log('📊 Calculando cobertura de disciplinas...');
    const DISCIPLINAS = [
        'Português', 'Matemática', 'História', 'Geografia', 'Ciências',
        'Inglês', 'Educação Física', 'Artes', 'Educação Digital',
        'Educação Financeira', 'Educação Ambiental', 'Ensino Religioso',
        'Projeto de Vida', 'Estudo Orientado'
    ];

    const subjectCoverage = new Map<string, { covered: number; total: number; percentage: number }>();

    for (const subject of DISCIPLINAS) {
        const allocations = teachers.flatMap(t =>
            t.allocations.filter(a => a.subject === subject)
        );

        const coveredClasses = new Set<string>();
        allocations.forEach(alloc => {
            alloc.classes.forEach(c => coveredClasses.add(c.classId));
        });

        const covered = coveredClasses.size;
        const total = TURMAS.length;
        const percentage = Math.round((covered / total) * 100);

        subjectCoverage.set(subject, {
            covered,
            total,
            percentage
        });

        const icon = percentage === 100 ? '✅' : percentage >= 50 ? '⚠️' : '❌';
        console.log(`   ${icon} ${subject}: ${covered}/${total} turmas (${percentage}%)`);

        if (percentage < 100) {
            warnings.push({
                type: 'incomplete_coverage',
                description: `${subject}: ${covered}/${total} turmas (${percentage}%) - ${total - covered} turmas sem professor`
            });
        }
    }
    console.log();

    // RESULTADO FINAL
    const valid = conflicts.filter(c => c.severity === 'critical').length === 0;

    return {
        valid,
        conflicts,
        warnings,
        stats: {
            totalLessons: lessons.length,
            teacherUtilization,
            subjectCoverage,
            consecutiveViolations
        }
    };
}

/**
 * Formata resultado para exibição
 */
export function formatValidationReport(result: ValidationResult): string {
    let report = '\n';
    report += '═══════════════════════════════════════════════\n';
    report += '          RELATÓRIO DE VALIDAÇÃO DA GRADE      \n';
    report += '═══════════════════════════════════════════════\n\n';

    // Status Geral
    if (result.valid) {
        report += '✅ GRADE VÁLIDA - Sem conflitos críticos!\n\n';
    } else {
        report += '❌ GRADE INVÁLIDA - Conflitos críticos detectados!\n\n';
    }

    // Conflitos Críticos
    if (result.conflicts.length > 0) {
        report += '🚨 CONFLITOS CRÍTICOS:\n';
        report += '─────────────────────────────────────────────\n';
        result.conflicts.forEach((c, idx) => {
            report += `${idx + 1}. ${c.description}\n`;
            if (c.details.message) {
                report += `   → ${c.details.message}\n`;
            }
        });
        report += '\n';
    }

    // Avisos
    if (result.warnings.length > 0) {
        report += '⚠️  AVISOS:\n';
        report += '─────────────────────────────────────────────\n';
        result.warnings.forEach((w, idx) => {
            report += `${idx + 1}. ${w.description}\n`;
        });
        report += '\n';
    }

    // Estatísticas
    report += '📊 ESTATÍSTICAS:\n';
    report += '─────────────────────────────────────────────\n';
    report += `Total de aulas: ${result.stats.totalLessons}\n`;
    report += `Violações de aulas consecutivas: ${result.stats.consecutiveViolations}\n\n`;

    report += 'Utilização de Professores:\n';
    result.stats.teacherUtilization.forEach((util, teacher) => {
        const bar = '█'.repeat(Math.floor(util.percentage / 5));
        report += `  ${teacher.padEnd(20)} ${util.used.toString().padStart(2)}/${util.capacity.toString().padEnd(2)} [${bar.padEnd(20)}] ${util.percentage}%\n`;
    });

    report += '\n';
    report += '═══════════════════════════════════════════════\n';

    return report;
}
