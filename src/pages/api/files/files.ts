import type { APIRoute } from 'astro';
import { blobService } from '../../../utils/blobService';
import { phoneValidator } from '../../../utils/phoneValidator';

export const GET: APIRoute = async ({ url }) => {
  try {
    const phoneNumber = url.searchParams.get('phoneNumber');

    if (!phoneNumber) {
      return new Response(
        JSON.stringify({
          error: 'Se requiere número de teléfono',
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
    const phoneValidation = phoneValidator.validatePhone(phoneNumber);
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

    const files = await blobService.getUserFiles(phoneValidation.cleanNumber);

    return new Response(
      JSON.stringify({
        phoneNumber: phoneValidation.cleanNumber,
        country: phoneValidation.country,
        totalFiles: files.length,
        files,
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
    console.error('Error al obtener archivos:', error);
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
