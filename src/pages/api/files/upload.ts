import type { APIRoute } from 'astro';
import { blobService } from '../../../utils/blobService';
import { phoneValidator } from '../../../utils/phoneValidator';

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const phoneNumber = formData.get('phoneNumber') as string;
    const file = formData.get('file') as File;
    const text = formData.get('text') as string;

    // Validar número de teléfono
    const phoneValidation = phoneValidator.validatePhone(phoneNumber);
    if (!phoneValidation.isValid || !phoneValidation.cleanNumber) {
      return new Response(
        JSON.stringify({
          error: phoneValidation.error || 'Número de teléfono inválido',
        }),
        { status: 400 }
      );
    }

    let result;
    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileName = `${file.name.replace(/\.[^/.]+$/, '')}_${Date.now()}${
        file.name.match(/\.[^/.]+$/)?.[0] || ''
      }`;

      try {
        result = await blobService.uploadFile(
          phoneValidation.cleanNumber,
          fileName,
          buffer,
          file.type
        );
      } catch (error: any) {
        if (error.message?.includes('Tipo de archivo no permitido')) {
          return new Response(
            JSON.stringify({
              error: error.message,
            }),
            { status: 400 }
          );
        }
        throw error;
      }
    } else if (text) {
      const fileName = `texto_${Date.now()}.txt`;
      const buffer = Buffer.from(text, 'utf-8');
      result = await blobService.uploadFile(
        phoneValidation.cleanNumber,
        fileName,
        buffer,
        'text/plain'
      );
    } else {
      return new Response(
        JSON.stringify({
          error: 'Se requiere un archivo o texto',
        }),
        { status: 400 }
      );
    }

    return new Response(
      JSON.stringify({
        message: 'Archivo subido exitosamente',
        fileName: result.fileName,
        downloadUrl: result.downloadUrl,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al subir archivo:', error);
    return new Response(
      JSON.stringify({
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido',
      }),
      { status: 500 }
    );
  }
};
