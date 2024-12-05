import type { APIRoute } from 'astro';
import { blobService } from '../../../utils/blobService';

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

    // Obtener credenciales desde Azure Blob
    const containerClient = await blobService.initialize('config');
    const blobClient = containerClient.getBlockBlobClient(
      'CLIENTFY_CREDENTIALS.json'
    );
    const downloadResponse = await blobClient.download();
    const credentials = await streamToJSON(
      downloadResponse.readableStreamBody ?? null
    );

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

// Función auxiliar para convertir ReadableStream a JSON
async function streamToJSON(stream: NodeJS.ReadableStream | null) {
  if (!stream) return null;

  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  const buffer = Buffer.concat(chunks);
  return JSON.parse(buffer.toString());
}
