import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'horario-escolar-secret-key-2024';

interface JWTPayload {
    userId: string;
    email: string;
    role: string;
}

// Estender Request para incluir dados do usuário
declare global {
    namespace Express {
        interface Request {
            userId?: string;
            userEmail?: string;
            userRole?: string;
        }
    }
}

/**
 * Middleware de autenticação - verifica token JWT
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            res.status(401).json({ error: 'Token não fornecido' });
            return;
        }

        const [, token] = authHeader.split(' ');

        if (!token) {
            res.status(401).json({ error: 'Token mal formatado' });
            return;
        }

        const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

        req.userId = decoded.userId;
        req.userEmail = decoded.email;
        req.userRole = decoded.role;

        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            res.status(401).json({ error: 'Token expirado' });
            return;
        }
        if (error instanceof jwt.JsonWebTokenError) {
            res.status(401).json({ error: 'Token inválido' });
            return;
        }
        res.status(500).json({ error: 'Erro na autenticação' });
    }
};

/**
 * Middleware para verificar role admin
 */
export const adminOnly = (req: Request, res: Response, next: NextFunction): void => {
    if (req.userRole !== 'admin') {
        res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
        return;
    }
    next();
};

/**
 * Middleware para verificar role admin ou coordenador
 */
export const adminOrCoordinator = (req: Request, res: Response, next: NextFunction): void => {
    if (req.userRole !== 'admin' && req.userRole !== 'coordenador') {
        res.status(403).json({ error: 'Acesso negado. Apenas administradores ou coordenadores.' });
        return;
    }
    next();
};

/**
 * Middleware opcional de autenticação (não bloqueia, mas preenche dados se tiver token)
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader) {
            const [, token] = authHeader.split(' ');
            if (token) {
                const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
                req.userId = decoded.userId;
                req.userEmail = decoded.email;
                req.userRole = decoded.role;
            }
        }

        next();
    } catch (error) {
        // Ignora erro e continua sem autenticação
        next();
    }
};
