import type { APIRoute } from 'astro';
import { blobService } from '../../../utils/blobService';
import { phoneValidator } from '../../../utils/phoneValidator';

export const POST: APIRoute = async ({ request }) => {
  try {
    const contentType = request.headers.get('content-type') || '';
    console.log('Content-Type:', contentType);

    let phoneNumber: string | undefined;
    let text: string | undefined;
    let file: File | null = null;

    // Para peticiones JSON
    if (contentType.includes('application/json')) {
      const jsonData = await request.json();
      phoneNumber = jsonData.phoneNumber;
      text = jsonData.text;
    }
    // Para peticiones x-www-form-urlencoded
    else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      phoneNumber = formData.get('phoneNumber')?.toString();
      text = formData.get('text')?.toString();
    }
    // Para peticiones raw
    else if (contentType.includes('text/plain')) {
      const body = await request.text();
      try {
        const jsonData = JSON.parse(body);
        phoneNumber = jsonData.phoneNumber;
        text = jsonData.text;
      } catch {
        text = body;
      }
    }
    // Para otros tipos de contenido
    else {
      try {
        const formData = await request.formData();
        phoneNumber = formData.get('phoneNumber')?.toString();
        text = formData.get('text')?.toString();
        file = formData.get('file') as File | null;
      } catch (error) {
        console.error('Error al procesar FormData:', error);
        return new Response(
          JSON.stringify({
            error: 'Error al procesar los datos del formulario',
            details:
              error instanceof Error ? error.message : 'Error desconocido',
            contentType,
          }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      }
    }

    // Validaciones
    if ((!file && !text) || !phoneNumber) {
      return new Response(
        JSON.stringify({
          error: 'Se requiere archivo o texto, y número de teléfono',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

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

    // Procesar texto
    if (text) {
      const fileName = `texto_${Date.now()}.txt`;
      const textBuffer = Buffer.from(text, 'utf-8');
      const result = await blobService.upload(
        phoneValidation.cleanNumber,
        fileName,
        textBuffer,
        'text/plain'
      );

      return new Response(
        JSON.stringify({
          message: 'Texto guardado exitosamente',
          fileName: result.fileName,
          downloadUrl: result.downloadUrl,
          type: 'text/plain',
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (file) {
      const arrayBuffer = await file.arrayBuffer();
      const result = await blobService.uploadFile(
        phoneValidation.cleanNumber,
        file.name,
        Buffer.from(arrayBuffer),
        file.type || 'application/octet-stream'
      );

      return new Response(
        JSON.stringify({
          message: 'Archivo subido exitosamente',
          fileName: result.fileName,
          originalName: file.name,
          downloadUrl: result.downloadUrl,
          type: file.type,
          country: phoneValidation.country,
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: 'No se proporcionó ningún contenido para subir',
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error detallado:', error);
    return new Response(
      JSON.stringify({
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido',
        stack: error instanceof Error ? error.stack : undefined,
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
