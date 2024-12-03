import type { APIRoute } from 'astro';
import Redis from 'ioredis';
import { z } from 'zod';
import { verifyToken } from '../../services/auth';

const PhoneSchema = z.object({
  nombre: z.string().min(2),
  celular: z.string().min(10),
  email: z.string().email(),
});

const redis = new Redis(process.env.REDIS_URL || '');

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Verificar autenticación
    const token = cookies.get('admin-token')?.value;
    const admin = token ? await verifyToken(token) : null;

    if (!admin) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'No autorizado',
        }),
        { status: 401 }
      );
    }

    const data = await request.json();
    const validationResult = PhoneSchema.safeParse(data);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Datos inválidos',
        }),
        { status: 400 }
      );
    }

    // Guardar celular en Redis con un ID único
    const phoneId = `phone:${Date.now()}`;
    const phoneData = {
      ...data,
      registeredBy: admin.username,
      createdAt: new Date().toISOString(),
    };

    await redis.set(phoneId, JSON.stringify(phoneData));

    // También mantener un índice de celulares
    await redis.sadd('phones', phoneId);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Celular registrado exitosamente',
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
