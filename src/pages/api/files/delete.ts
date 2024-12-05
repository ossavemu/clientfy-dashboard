import type { APIRoute } from 'astro';
import { blobService } from '../../../utils/blobService';
import { phoneValidator } from '../../../utils/phoneValidator';

export const DELETE: APIRoute = async ({ url }) => {
  try {
    const phoneNumber = url.searchParams.get('phoneNumber');
    const fileName = url.searchParams.get('fileName');

    if (!phoneNumber || !fileName) {
      return new Response(
        JSON.stringify({
          error: 'Se requiere número de teléfono y nombre del archivo',
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

    await blobService.deleteFile(phoneValidation.cleanNumber, fileName);

    return new Response(
      JSON.stringify({
        message: 'Archivo eliminado exitosamente',
        fileName,
        phoneNumber: phoneValidation.cleanNumber,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
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
