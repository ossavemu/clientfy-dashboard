import type { APIRoute } from 'astro';
import { z } from 'zod';
import { redis } from '../../config/redis';

const PhoneSchema = z.object({
  celular: z.string().regex(/^[0-9]+$/, 'Solo números permitidos'),
  tipo: z.enum(['meta', 'qr']),
  username: z.string(),
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const validation = PhoneSchema.safeParse(data);

    if (!validation.success) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Datos inválidos',
          errors: validation.error.errors,
        }),
        { status: 400 }
      );
    }

    const { celular, tipo, username } = data;

    // Primero verificar si el usuario ya tiene un teléfono usando un índice específico
    const userPhoneKey = `user:${username}:phone`;
    const existingUserPhone = await redis.get(userPhoneKey);

    if (existingUserPhone) {
      return new Response(
        JSON.stringify({
          success: false,
          message:
            'Ya tienes un número registrado. No es posible registrar más números.',
        }),
        { status: 400 }
      );
    }

    // Verificar si el celular ya está registrado
    const phoneKey = `phone:${celular}`;
    const existingPhone = await redis.get(phoneKey);

    if (existingPhone) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Este número ya está registrado',
        }),
        { status: 400 }
      );
    }

    // Guardar en Redis usando transacción para asegurar atomicidad
    const multi = redis.multi();

    // Guardar los datos del teléfono
    multi.set(
      phoneKey,
      JSON.stringify({
        name: `${username} - ${celular}`,
        celular,
        tipo,
        username, // Agregar username para referencia
        createdAt: new Date().toISOString(),
        trialEndsAt:
          tipo === 'qr'
            ? new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
            : null,
      })
    );

    // Crear referencia del usuario a su teléfono
    multi.set(userPhoneKey, celular);

    // Ejecutar transacción
    await multi.exec();

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
