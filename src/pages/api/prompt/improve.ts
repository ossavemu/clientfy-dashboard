import type { APIRoute } from 'astro';
import { improvePrompt } from '../../../services/ai';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'El prompt es requerido',
        }),
        { status: 400 }
      );
    }

    const improvedPrompt = await improvePrompt(prompt);

    return new Response(
      JSON.stringify({
        success: true,
        improvedPrompt,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Error al mejorar el prompt',
      }),
      { status: 500 }
    );
  }
};
