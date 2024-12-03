import bcrypt from 'bcrypt';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-2024';
const SALT_ROUNDS = 10;

// Conexión a Redis
const redis = new Redis(process.env.REDIS_URL || '');

export interface Admin {
  username: string;
  password: string;
  email: string;
  role: 'admin';
  createdAt: string;
}

interface JWTPayload {
  username: string;
  role: string;
  exp: number;
}

// Función para verificar admin
export async function verifyAdmin(username: string, password: string) {
  try {
    // Buscar admin en Redis
    const adminData = await redis.get(`admin:${username}`);
    if (!adminData) {
      console.log('Admin no encontrado:', username);
      return null;
    }

    const admin = JSON.parse(adminData) as Admin;
    const isValid = await bcrypt.compare(password, admin.password);

    if (!isValid) {
      console.log('Contraseña inválida para:', username);
      return null;
    }

    return admin;
  } catch (error) {
    console.error('Error verificando admin:', error);
    return null;
  }
}

export function generateToken(admin: Admin) {
  return jwt.sign(
    {
      username: admin.username,
      role: admin.role,
      exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 horas
    },
    JWT_SECRET
  );
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    // Verificar que el admin aún existe en Redis
    const adminExists = await redis.exists(`admin:${decoded.username}`);
    if (!adminExists) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}
