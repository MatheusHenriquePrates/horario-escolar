import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import teacherRoutes from './routes/teacherRoutes';
import scheduleRoutes from './routes/scheduleRoutes';
import pdfRoutes from './routes/pdfRoutes';
import validationRoutes from './routes/validationRoutes';
import authRoutes from './routes/authRoutes';
import configRoutes from './routes/configRoutes';
import roomRoutes from './routes/roomRoutes';
import preferenceRoutes from './routes/preferenceRoutes';
import classRoutes from './routes/classRoutes';
import { authMiddleware } from './middleware/auth';
import { setupSecurity, loginLimiter, generateLimiter, pdfLimiter } from './middleware/security';
import { setupInitialAdmin } from './controllers/authController';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Confiar no proxy (nginx) para X-Forwarded-For
app.set('trust proxy', 1);

// CORS configuração
const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:8765',
    'http://localhost:5173',
    'http://localhost:3001'
];

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// 🛡️ Segurança (Helmet + Rate Limiting geral)
setupSecurity(app);

// Health check (público, sem rate limit específico)
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

// Rotas públicas (com rate limiting específico para login)
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRoutes);

// 🔐 ROTAS PROTEGIDAS (precisa de token JWT)
app.use('/api/teachers', authMiddleware, teacherRoutes);
app.use('/api/grade/gerar', authMiddleware, generateLimiter); // Rate limit extra para geração
app.use('/api/grade', authMiddleware, scheduleRoutes);
app.use('/api/pdf', authMiddleware, pdfLimiter, pdfRoutes); // Rate limit extra para PDF
app.use('/api/validation', authMiddleware, validationRoutes);
app.use('/api/config', authMiddleware, configRoutes);         // Configurações do sistema
app.use('/api/rooms', authMiddleware, roomRoutes);            // Salas de aula
app.use('/api/preferences', authMiddleware, preferenceRoutes); // Preferências de professores
app.use('/api/classes', authMiddleware, classRoutes);         // Turmas

// Error handler global
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('❌ Erro não tratado:', err);
    res.status(500).json({
        error: 'Erro interno do servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

console.log('');
console.log('═══════════════════════════════════════════════════════');
console.log('  🏫 HORÁRIO ESCOLAR INTELIGENTE - API');
console.log('═══════════════════════════════════════════════════════');
console.log('');
console.log('📍 Rotas disponíveis:');
console.log('   🔓 POST /api/auth/login     - Login (5 tentativas/15min)');
console.log('   🔓 POST /api/auth/register  - Cadastrar usuário');
console.log('   🔐 GET  /api/auth/me        - Dados do usuário logado');
console.log('   🔐 *    /api/teachers/*     - CRUD Professores');
console.log('   🔐 POST /api/grade/gerar    - Gerar Grade (10/hora)');
console.log('   🔐 *    /api/grade/*        - Consultar Grade');
console.log('   🔐 *    /api/pdf/*          - Exportar PDF (20/hora)');
console.log('   🔐 *    /api/config/*       - Configurações do sistema');
console.log('   🔐 *    /api/rooms/*        - Gestão de salas');
console.log('   🔐 *    /api/preferences/*  - Preferências de professores');
console.log('   🔐 *    /api/classes/*      - Gestão de turmas');
console.log('');

// Inicializar banco e criar admin se necessário
setupInitialAdmin().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
        console.log('═══════════════════════════════════════════════════════');
        console.log('');
    });
});
