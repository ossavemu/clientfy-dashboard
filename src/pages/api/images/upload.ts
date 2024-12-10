import type { APIRoute } from 'astro';
import { blobService } from '../../../utils/blobService';
import { phoneValidator } from '../../../utils/phoneValidator';

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const phoneNumber = formData.get('phoneNumber') as string;
    const image = formData.get('image') as File;
    const name = formData.get('name') as string;

    // Validaciones
    if (!phoneNumber || !image || !name) {
      return new Response(
        JSON.stringify({ error: 'Se requieren phoneNumber, image y name' }),
        { status: 400 }
      );
    }

    const phoneValidation = phoneValidator.validatePhone(phoneNumber);
    if (!phoneValidation.isValid || !phoneValidation.cleanNumber) {
      return new Response(
        JSON.stringify({
          error: phoneValidation.error || 'Número de teléfono inválido',
        }),
        { status: 400 }
      );
    }

    if (!image.type.startsWith('image/')) {
      return new Response(
        JSON.stringify({ error: 'El archivo debe ser una imagen' }),
        { status: 400 }
      );
    }

    const arrayBuffer = await image.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generar nombre único para el archivo
    const timestamp = Date.now();
    const fileName = `${name.replace(/\s+/g, '_')}_${timestamp}.jpg`;

    // Subir al blob storage
    const result = await blobService.upload(
      phoneValidation.cleanNumber,
      fileName,
      buffer,
      'image/jpeg'
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Imagen subida exitosamente',
        data: { name: fileName, url: result.downloadUrl },
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al subir imagen:', error);
    return new Response(
      JSON.stringify({
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido',
      }),
      { status: 500 }
    );
  }
};
