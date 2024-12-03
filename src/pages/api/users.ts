import type { APIRoute } from 'astro';
import bcrypt from 'bcrypt';
import Redis from 'ioredis';
import { z } from 'zod';

// Schema de validación para administradores
const AdminSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
});

// Conexión a Redis
const redis = new Redis(process.env.REDIS_URL || '');

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();

    // Validar datos
    const validationResult = AdminSchema.safeParse(data);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Datos inválidos',
        }),
        { status: 400 }
      );
    }

    // Verificar si el admin ya existe
    const existingAdmin = await redis.get(`admin:${data.username}`);
    if (existingAdmin) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'El nombre de usuario ya está registrado',
        }),
        { status: 400 }
      );
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Guardar admin en Redis
    const adminData = {
      username: data.username,
      email: data.email,
      password: hashedPassword,
      role: 'admin',
      createdAt: new Date().toISOString(),
    };

    await redis.set(`admin:${data.username}`, JSON.stringify(adminData));

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Administrador registrado exitosamente',
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Error interno del servidor',
      }),
      { status: 500 }
    );
  }
};
