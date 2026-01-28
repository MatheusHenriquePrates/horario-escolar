import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prismaClient';

const JWT_SECRET = process.env.JWT_SECRET || 'horario-escolar-secret-key-2024';
const JWT_EXPIRES_IN = '7d';

interface JWTPayload {
    userId: string;
    email: string;
    role: string;
}

/**
 * Registrar novo usuário
 */
export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password, name, role } = req.body;

        // Validações
        if (!email || !password || !name) {
            res.status(400).json({ error: 'Email, senha e nome são obrigatórios' });
            return;
        }

        if (password.length < 6) {
            res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });
            return;
        }

        // Verificar se email já existe
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            res.status(400).json({ error: 'Email já cadastrado' });
            return;
        }

        // Hash da senha
        const hashedPassword = await bcrypt.hash(password, 10);

        // Criar usuário
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role: role || 'coordenador'
            }
        });

        // Gerar token
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role } as JWTPayload,
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        console.log(`✅ Usuário registrado: ${user.email} (${user.role})`);

        res.status(201).json({
            message: 'Usuário criado com sucesso',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            },
            token
        });
    } catch (error) {
        console.error('❌ Erro ao registrar:', error);
        res.status(500).json({ error: 'Erro ao criar usuário' });
    }
};

/**
 * Login de usuário
 */
export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        // Validações
        if (!email || !password) {
            res.status(400).json({ error: 'Email e senha são obrigatórios' });
            return;
        }

        // Buscar usuário
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            res.status(401).json({ error: 'Credenciais inválidas' });
            return;
        }

        if (!user.active) {
            res.status(401).json({ error: 'Usuário desativado' });
            return;
        }

        // Verificar senha
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            res.status(401).json({ error: 'Credenciais inválidas' });
            return;
        }

        // Gerar token
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role } as JWTPayload,
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        console.log(`✅ Login: ${user.email}`);

        res.json({
            message: 'Login realizado com sucesso',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            },
            token
        });
    } catch (error) {
        console.error('❌ Erro no login:', error);
        res.status(500).json({ error: 'Erro ao fazer login' });
    }
};

/**
 * Verificar token e retornar dados do usuário
 */
export const me = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.userId;

        if (!userId) {
            res.status(401).json({ error: 'Usuário não autenticado' });
            return;
        }

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user || !user.active) {
            res.status(401).json({ error: 'Usuário não encontrado' });
            return;
        }

        res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });
    } catch (error) {
        console.error('❌ Erro ao buscar usuário:', error);
        res.status(500).json({ error: 'Erro ao buscar dados do usuário' });
    }
};

/**
 * Alterar senha
 */
export const changePassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.userId;
        const { currentPassword, newPassword } = req.body;

        if (!userId) {
            res.status(401).json({ error: 'Usuário não autenticado' });
            return;
        }

        if (!currentPassword || !newPassword) {
            res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
            return;
        }

        if (newPassword.length < 6) {
            res.status(400).json({ error: 'Nova senha deve ter no mínimo 6 caracteres' });
            return;
        }

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            res.status(404).json({ error: 'Usuário não encontrado' });
            return;
        }

        // Verificar senha atual
        const isValidPassword = await bcrypt.compare(currentPassword, user.password);
        if (!isValidPassword) {
            res.status(401).json({ error: 'Senha atual incorreta' });
            return;
        }

        // Hash da nova senha
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        });

        console.log(`✅ Senha alterada: ${user.email}`);

        res.json({ message: 'Senha alterada com sucesso' });
    } catch (error) {
        console.error('❌ Erro ao alterar senha:', error);
        res.status(500).json({ error: 'Erro ao alterar senha' });
    }
};

/**
 * Listar todos os usuários (apenas admin)
 */
export const listUsers = async (_req: Request, res: Response): Promise<void> => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                active: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(users);
    } catch (error) {
        console.error('❌ Erro ao listar usuários:', error);
        res.status(500).json({ error: 'Erro ao listar usuários' });
    }
};

/**
 * Criar usuário inicial admin (se não existir nenhum)
 */
export const setupInitialAdmin = async (): Promise<void> => {
    try {
        const userCount = await prisma.user.count();

        if (userCount === 0) {
            const hashedPassword = await bcrypt.hash('admin123', 10);

            await prisma.user.create({
                data: {
                    email: 'admin@escola.com',
                    password: hashedPassword,
                    name: 'Administrador',
                    role: 'admin'
                }
            });

            console.log('');
            console.log('═══════════════════════════════════════════════════════');
            console.log('  🔐 USUÁRIO ADMIN CRIADO AUTOMATICAMENTE');
            console.log('═══════════════════════════════════════════════════════');
            console.log('  Email: admin@escola.com');
            console.log('  Senha: admin123');
            console.log('');
            console.log('  ⚠️  ALTERE A SENHA APÓS O PRIMEIRO LOGIN!');
            console.log('═══════════════════════════════════════════════════════');
            console.log('');
        }
    } catch (error) {
        console.error('Erro ao criar admin inicial:', error);
    }
};
