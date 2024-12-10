import type { APIRoute } from 'astro';
import { blobService } from '../../../utils/blobService';

export const GET: APIRoute = async ({ request }) => {
  try {
    // Verificar la clave de acceso usando import.meta.env
    const key = request.headers.get('x-env-key');
    if (key !== import.meta.env.ENV_FILE_KEY) {
      console.log('Key recibida:', key);
      console.log('Key esperada:', import.meta.env.ENV_FILE_KEY);
      return new Response(
        JSON.stringify({
          error: 'No autorizado',
          message: 'Clave de acceso inválida',
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const envContent = await blobService.getFileFromConfig('.env');
    if (!envContent) {
      return new Response(
        JSON.stringify({
          error: 'No encontrado',
          message: 'Archivo .env no encontrado',
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    return new Response(envContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': 'attachment; filename=".env"',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error obteniendo .env:', error);
    return new Response(
      JSON.stringify({
        error: 'Error interno',
        message: 'Error al obtener el archivo .env',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
