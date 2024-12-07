import type { APIRoute } from 'astro';
import Redis from 'ioredis';
import { verifyToken } from '../../../services/auth';

const redis = new Redis(process.env.REDIS_URL || '');

export const POST: APIRoute = async ({ cookies }) => {
  try {
    const token = cookies.get('client-token')?.value;
    const user = token ? await verifyToken(token) : null;

    if (!user || user.role !== 'client') {
      return new Response(
        JSON.stringify({ success: false, message: 'No autorizado' }),
        { status: 401 }
      );
    }

    // Agregar suscripción de prueba
    const trialExpiration = new Date();
    trialExpiration.setDate(trialExpiration.getDate() + 7);

    const userData = await redis.get(`user:${user.username}`);
    if (userData) {
      const updatedUser = JSON.parse(userData);
      updatedUser.subscription = {
        type: 'trial',
        expiresAt: trialExpiration.toISOString(),
      };
      await redis.set(`user:${user.username}`, JSON.stringify(updatedUser));
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Prueba activada exitosamente',
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Error interno del servidor' }),
      { status: 500 }
    );
  }
};
