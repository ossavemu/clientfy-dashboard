import type { APIRoute } from 'astro';
import { blobService } from '../../../utils/blobService';
import { phoneValidator } from '../../../utils/phoneValidator';

export const GET: APIRoute = async ({ params }) => {
  try {
    const number = params.number;

    if (!number) {
      return new Response(
        JSON.stringify({
          error: 'Se requiere el número de teléfono',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Validar el número de teléfono
    const phoneValidation = phoneValidator.validatePhone(number);
    if (!phoneValidation.isValid || !phoneValidation.cleanNumber) {
      return new Response(
        JSON.stringify({
          error: phoneValidation.error || 'Número de teléfono inválido',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const prompt = await blobService.getPrompt(phoneValidation.cleanNumber);

    if (!prompt) {
      return new Response(
        JSON.stringify({
          error: 'Prompt no encontrado',
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        numero: phoneValidation.cleanNumber,
        country: phoneValidation.country,
        prompt: prompt.prompt,
        fileName: prompt.fileName,
        downloadUrl: prompt.downloadUrl,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      }
    );
  } catch (error) {
    console.error('Error al obtener prompt:', error);
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
