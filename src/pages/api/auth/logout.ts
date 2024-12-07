import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ cookies, redirect }) => {
  // Eliminar ambas cookies por seguridad
  cookies.delete('admin-token', {
    path: '/',
  });

  cookies.delete('client-token', {
    path: '/',
  });

  // Redirigir a la página de login
  return redirect('/login', 302);
};
