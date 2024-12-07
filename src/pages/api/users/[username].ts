import type { APIRoute } from 'astro';
import { redis } from '../../../config/redis';

export const DELETE: APIRoute = async ({ params }) => {
  try {
    const { username } = params;
    if (!username) {
      return new Response(JSON.stringify({ error: 'Username es requerido' }), {
        status: 400,
      });
    }

    // Eliminar usuario de Redis
    await redis.del(`user:${username}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Usuario eliminado' }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { status: 500 }
    );
  }
};
