import type { APIRoute } from 'astro';
import { redis } from '../../config/redis';

export const GET: APIRoute = async () => {
  try {
    const state = await redis.get('whatsapp:state');
    const instances = state ? JSON.parse(state) : { instances: [] };

    return new Response(JSON.stringify(instances), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error al obtener el estado:', error);
    return new Response(
      JSON.stringify({ error: 'Error al obtener el estado' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    await redis.set('whatsapp:state', JSON.stringify(data));

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error al actualizar el estado:', error);
    return new Response(
      JSON.stringify({ error: 'Error al actualizar el estado' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
