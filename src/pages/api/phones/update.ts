import type { APIRoute } from 'astro';
import { z } from 'zod';
import { redis } from '../../../config/redis';

const UpdateSchema = z.object({
  celular: z.string(),
  tipo: z.enum(['meta', 'qr']),
});

export const PUT: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const validation = UpdateSchema.safeParse(data);

    if (!validation.success) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Datos inválidos',
        }),
        { status: 400 }
      );
    }

    const { celular, tipo } = data;
    const phoneKey = `phone:${celular}`;

    // Obtener datos actuales
    const existingData = await redis.get(phoneKey);
    if (!existingData) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Teléfono no encontrado',
        }),
        { status: 404 }
      );
    }

    // Actualizar datos
    const currentData = JSON.parse(existingData);
    const updatedData = {
      ...currentData,
      tipo,
      trialEndsAt:
        tipo === 'qr'
          ? new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
          : null,
    };

    await redis.set(phoneKey, JSON.stringify(updatedData));

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Teléfono actualizado exitosamente',
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
