import { Router } from 'express';
import {
    generateSchedule,
    getSchedule,
    getScheduleByClass,
    getScheduleByTeacher,
    updateLesson,
    deleteLesson
} from '../controllers/scheduleController';

const router = Router();

router.post('/gerar', generateSchedule);
router.get('/', getSchedule);
router.get('/turma/:turma', getScheduleByClass);
router.get('/professor/:id', getScheduleByTeacher);
router.put('/aula', updateLesson);
router.delete('/aula', deleteLesson);

export default router;
