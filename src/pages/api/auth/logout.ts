import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ cookies, redirect }) => {
  // Eliminar la cookie
  cookies.delete('admin-token', {
    path: '/',
  });

  // Redirigir a la página principal
  return redirect('/', 302);
};
