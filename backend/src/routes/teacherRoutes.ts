import { Router } from 'express';
import {
    getTeachers,
    createTeacher,
    getTeacherById,
    updateTeacher,
    deleteTeacher,
    getDistributionStats
} from '../controllers/teacherController';

const router = Router();

router.get('/', getTeachers);
router.get('/stats/distribution', getDistributionStats); // ANTES de /:id
router.post('/', createTeacher);
router.get('/:id', getTeacherById);
router.put('/:id', updateTeacher);
router.delete('/:id', deleteTeacher);

export default router;
