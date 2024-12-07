import type { APIRoute } from 'astro';
import { redis } from '../../../config/redis';

export const DELETE: APIRoute = async ({ params }) => {
  try {
    const { phone } = params;
    if (!phone) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Número de teléfono requerido',
        }),
        { status: 400 }
      );
    }

    // Obtener datos del teléfono para encontrar el usuario
    const phoneKey = `phone:${phone}`;
    const phoneData = await redis.get(phoneKey);

    if (phoneData) {
      const { username } = JSON.parse(phoneData);
      const userPhoneKey = `user:${username}:phone`;

      // Eliminar todas las referencias en Redis
      const multi = redis.multi();
      multi.del(phoneKey);
      multi.del(userPhoneKey);
      await multi.exec();
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Teléfono eliminado exitosamente',
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
