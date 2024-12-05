import type { APIRoute } from 'astro';
import { blobService } from '../../../utils/blobService';
import { phoneValidator } from '../../../utils/phoneValidator';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { number, prompt } = await request.json();

    if (!number || !prompt) {
      return new Response(
        JSON.stringify({
          error: 'Se requieren los campos numero y prompt',
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

    const result = await blobService.uploadPrompt(
      phoneValidation.cleanNumber,
      prompt
    );

    return new Response(
      JSON.stringify({
        message: 'Prompt guardado exitosamente',
        fileName: result.fileName,
        downloadUrl: result.downloadUrl,
        prompt: result.prompt,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error al guardar prompt:', error);
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
