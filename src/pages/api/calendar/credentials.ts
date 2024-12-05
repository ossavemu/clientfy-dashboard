import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url }) => {
  try {
    const key = url.searchParams.get('key');

    if (key !== import.meta.env.CALENDAR_CREDENTIALS_KEY) {
      return new Response(
        JSON.stringify({
          error: 'Credenciales inválidas',
          message: 'No está autorizado para acceder a este recurso',
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const response = await fetch(import.meta.env.CALENDAR_CREDENTIALS_URL);
    const credentials = await response.json();

    if (!credentials) {
      return new Response(
        JSON.stringify({
          error: 'Error al obtener credenciales',
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    return new Response(JSON.stringify(credentials), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'max-age=3600', // Cache por 1 hora
      },
    });
  } catch (error) {
    console.error('Error al obtener credenciales:', error);
    return new Response(
      JSON.stringify({
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido',
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
