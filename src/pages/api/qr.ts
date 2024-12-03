import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url }) => {
  try {
    const port = url.searchParams.get('port');
    if (!port) {
      return new Response(JSON.stringify({ error: 'Puerto no especificado' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    const response = await fetch(`http://4.239.88.228:${port}/`);
    const imageBuffer = await response.arrayBuffer();

    return new Response(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
      },
    });
  } catch (error) {
    console.error('Error al obtener QR:', error);
    return new Response(
      JSON.stringify({ error: 'Error al obtener el código QR' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
