import { Router, Request, Response } from 'express';
import { validateSchedule, formatValidationReport } from '../utils/gradeValidator';

const router = Router();

router.get('/validate', async (req: Request, res: Response) => {
    try {
        console.log('\n🔍 Requisição de validação recebida...\n');

        const result = await validateSchedule();
        const report = formatValidationReport(result);

        console.log(report);

        res.json({
            valid: result.valid,
            conflicts: result.conflicts,
            warnings: result.warnings,
            stats: {
                totalLessons: result.stats.totalLessons,
                teacherUtilization: Array.from(result.stats.teacherUtilization.entries()).map(([name, util]) => ({
                    teacher: name,
                    ...util
                })),
                subjectCoverage: Array.from(result.stats.subjectCoverage.entries()).map(([subject, cov]) => ({
                    subject,
                    ...cov
                })),
                consecutiveViolations: result.stats.consecutiveViolations
            },
            report
        });
    } catch (error) {
        console.error('❌ Erro ao validar grade:', error);
        res.status(500).json({ error: 'Erro ao validar grade', details: error });
    }
});

export default router;
