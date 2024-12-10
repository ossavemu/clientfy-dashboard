import type { APIRoute } from 'astro';
import { redis } from '../../../config/redis';
import { blobService } from '../../../utils/blobService';
import { phoneValidator } from '../../../utils/phoneValidator';

interface ImageReference {
  name: string;
  url: string;
  originalName?: string;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const { phoneNumber, references } = await request.json();

    // Validar el número de teléfono
    const phoneValidation = phoneValidator.validatePhone(phoneNumber);
    if (!phoneValidation.isValid || !phoneValidation.cleanNumber) {
      return new Response(
        JSON.stringify({
          error: phoneValidation.error || 'Número de teléfono inválido',
        }),
        { status: 400 }
      );
    }

    // Validar el formato de las referencias
    if (!Array.isArray(references)) {
      return new Response(
        JSON.stringify({
          error: 'El formato de referencias es inválido',
        }),
        { status: 400 }
      );
    }

    // Validar cada referencia
    const isValidReference = references.every(
      (ref: any) =>
        typeof ref.name === 'string' &&
        typeof ref.url === 'string' &&
        ref.url.trim() !== '' &&
        ref.name.trim() !== ''
    );

    if (!isValidReference) {
      return new Response(
        JSON.stringify({
          error: 'Formato inválido en una o más referencias',
        }),
        { status: 400 }
      );
    }

    // Guardar en Redis
    const key = `images:references:${phoneValidation.cleanNumber}`;
    await redis.set(key, JSON.stringify(references));

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Referencias guardadas exitosamente',
        data: references,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al guardar referencias:', error);
    return new Response(
      JSON.stringify({
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido',
      }),
      { status: 500 }
    );
  }
};

// Actualizar nombre de imagen
export const PUT: APIRoute = async ({ request }) => {
  try {
    const { phoneNumber, oldName, newName } = await request.json();

    const phoneValidation = phoneValidator.validatePhone(phoneNumber);
    if (!phoneValidation.isValid || !phoneValidation.cleanNumber) {
      return new Response(
        JSON.stringify({
          error: phoneValidation.error || 'Número de teléfono inválido',
        }),
        { status: 400 }
      );
    }

    const key = `images:references:${phoneValidation.cleanNumber}`;
    const existingData = await redis.get(key);

    if (!existingData) {
      return new Response(
        JSON.stringify({ error: 'No se encontraron imágenes' }),
        { status: 404 }
      );
    }

    const references = JSON.parse(existingData);
    const imageIndex = references.findIndex(
      (ref: ImageReference) => ref.name === oldName
    );

    if (imageIndex === -1) {
      return new Response(JSON.stringify({ error: 'Imagen no encontrada' }), {
        status: 404,
      });
    }

    // Actualizar el nombre en el blob storage
    await blobService.renameFile(phoneValidation.cleanNumber, oldName, newName);

    // Actualizar referencia en Redis
    references[imageIndex].name = newName;
    await redis.set(key, JSON.stringify(references));

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Nombre actualizado exitosamente',
        data: references,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al actualizar nombre:', error);
    return new Response(
      JSON.stringify({
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido',
      }),
      { status: 500 }
    );
  }
};

// Eliminar imagen
export const DELETE: APIRoute = async ({ request }) => {
  try {
    const { phoneNumber, imageName } = await request.json();

    const phoneValidation = phoneValidator.validatePhone(phoneNumber);
    if (!phoneValidation.isValid || !phoneValidation.cleanNumber) {
      return new Response(
        JSON.stringify({
          error: phoneValidation.error || 'Número de teléfono inválido',
        }),
        { status: 400 }
      );
    }

    // Eliminar del blob storage
    await blobService.deleteFile(phoneValidation.cleanNumber, imageName);

    // Actualizar referencias en Redis
    const key = `images:references:${phoneValidation.cleanNumber}`;
    const existingData = await redis.get(key);

    if (existingData) {
      const references = JSON.parse(existingData);
      const updatedReferences = references.filter(
        (ref: ImageReference) => ref.name !== imageName
      );
      await redis.set(key, JSON.stringify(updatedReferences));
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Imagen eliminada exitosamente',
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al eliminar imagen:', error);
    return new Response(
      JSON.stringify({
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido',
      }),
      { status: 500 }
    );
  }
};

export const GET: APIRoute = async ({ url }) => {
  try {
    const phoneNumber = url.searchParams.get('phoneNumber');

    if (!phoneNumber) {
      return new Response(
        JSON.stringify({
          error: 'Se requiere número de teléfono',
        }),
        { status: 400 }
      );
    }

    // Validar el número de teléfono
    const phoneValidation = phoneValidator.validatePhone(phoneNumber);
    if (!phoneValidation.isValid || !phoneValidation.cleanNumber) {
      return new Response(
        JSON.stringify({
          error: phoneValidation.error || 'Número de teléfono inválido',
        }),
        { status: 400 }
      );
    }

    // Obtener referencias de Redis
    const key = `images:references:${phoneValidation.cleanNumber}`;
    const references = await redis.get(key);

    if (!references) {
      return new Response(
        JSON.stringify({
          message: 'No hay referencias guardadas para este número',
          data: [],
        }),
        { status: 200 }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: JSON.parse(references),
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al obtener referencias:', error);
    return new Response(
      JSON.stringify({
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido',
      }),
      { status: 500 }
    );
  }
};
