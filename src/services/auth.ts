import bcrypt from 'bcrypt';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-2024';
const ADMIN_PASSWORD = 'c497d8ed-b4d9-4663-8b8a-a88083d82fa4';

const redis = new Redis(process.env.REDIS_URL || '');

export interface User {
  username: string;
  password: string;
  email: string;
  role: 'admin' | 'client';
  createdAt: string;
  subscription?: {
    type: 'trial' | 'premium';
    expiresAt: string;
  };
}

export async function verifyUser(username: string, password: string) {
  try {
    // Verificar si es admin con credenciales específicas
    if (username === 'admin' && password === ADMIN_PASSWORD) {
      return {
        username: 'admin',
        email: 'admin@clientfy.com',
        role: 'admin',
        createdAt: new Date().toISOString(),
      };
    }

    // Si no es admin, buscar en usuarios normales
    const userData = await redis.get(`user:${username}`);
    if (!userData) {
      return null;
    }

    const user = JSON.parse(userData) as User;
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return null;
    }

    return user;
  } catch (error) {
    console.error('Error verificando usuario:', error);
    return null;
  }
}

export async function verifyToken(token: string) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { username: string };

    // Si es admin, retornar objeto admin
    if (decoded.username === 'admin') {
      return {
        username: 'admin',
        email: 'admin@clientfy.com',
        role: 'admin',
        createdAt: new Date().toISOString(),
      };
    }

    // Si no es admin, buscar en usuarios normales
    const userData = await redis.get(`user:${decoded.username}`);
    if (!userData) {
      return null;
    }
    return JSON.parse(userData) as User;
  } catch (error) {
    console.error('Error verificando token:', error);
    return null;
  }
}

export async function createUser(userData: Omit<User, 'createdAt' | 'role'>) {
  try {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const user: User = {
      ...userData,
      password: hashedPassword,
      role: 'client',
      createdAt: new Date().toISOString(),
    };

    await redis.set(`user:${userData.username}`, JSON.stringify(user));
    return user;
  } catch (error) {
    console.error('Error creando usuario:', error);
    return null;
  }
}

export function generateToken(username: string): string {
  return jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });
}
