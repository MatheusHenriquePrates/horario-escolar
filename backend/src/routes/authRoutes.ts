import { Router } from 'express';
import { register, login, me, changePassword, listUsers } from '../controllers/authController';
import { authMiddleware, adminOnly } from '../middleware/auth';
import { validateBody, loginSchema, registerSchema, changePasswordSchema } from '../schemas';

const router = Router();

// Rotas públicas (sem autenticação) - com validação Zod
router.post('/login', validateBody(loginSchema), login);
router.post('/register', validateBody(registerSchema), register);

// Rotas protegidas (precisa de token)
router.get('/me', authMiddleware, me);
router.put('/change-password', authMiddleware, validateBody(changePasswordSchema), changePassword);

// Rotas admin
router.get('/users', authMiddleware, adminOnly, listUsers);

export default router;
