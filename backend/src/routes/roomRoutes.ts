import { Router } from 'express';
import {
    getRooms,
    getRoomById,
    createRoom,
    updateRoom,
    deleteRoom,
    checkRoomAvailability,
    getRoomTypes
} from '../controllers/roomController';

const router = Router();

// Tipos de sala
router.get('/types', getRoomTypes);

// CRUD
router.get('/', getRooms);
router.post('/', createRoom);
router.get('/:id', getRoomById);
router.put('/:id', updateRoom);
router.delete('/:id', deleteRoom);

// Disponibilidade
router.get('/:id/availability', checkRoomAvailability);

export default router;
