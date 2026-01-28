import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { Express } from 'express';

const isDev = process.env.NODE_ENV === 'development';

/**
 * Rate limiter geral - 100 requisições por 15 minutos (1000 em dev)
 */
export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: isDev ? 1000 : 100, // mais permissivo em dev
    message: {
        error: 'Muitas requisições. Tente novamente em 15 minutos.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Rate limiter para login - 5 tentativas por 15 minutos (50 em dev)
 */
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: isDev ? 50 : 5, // mais permissivo em dev
    message: {
        error: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Rate limiter para geração de horários - 10 por hora
 */
export const generateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 10, // máximo 10 gerações por hora
    message: {
        error: 'Limite de geração de horários atingido. Tente novamente em 1 hora.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Rate limiter para PDF - 20 por hora
 */
export const pdfLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 20, // máximo 20 PDFs por hora
    message: {
        error: 'Limite de exportação de PDF atingido. Tente novamente em 1 hora.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Configura middlewares de segurança no app Express
 */
export function setupSecurity(app: Express): void {
    // Helmet - Headers de segurança
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", "data:", "blob:"]
            }
        },
        crossOriginEmbedderPolicy: false // Para permitir PDF download
    }));

    // Rate limiter geral (aplicado a todas as rotas)
    app.use('/api/', generalLimiter);

    console.log('🛡️  Segurança configurada: Helmet + Rate Limiting');
}
