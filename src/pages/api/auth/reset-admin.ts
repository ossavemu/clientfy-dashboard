import type { APIRoute } from 'astro';
import { join } from 'path';
import { readFile, writeFile } from 'fs/promises';
import bcrypt from 'bcrypt';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin2024';
const SALT_ROUNDS = 10;

export const POST: APIRoute = async () => {
  try {
    const filePath = join(process.cwd(), 'src/data/admins.json');
    
    // Leer el archivo actual
    const content = await readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    
    // Crear nuevo hash
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS);
    
    // Actualizar contraseñas
    data.admins = data.admins.map((admin: any) => ({
      ...admin,
      password: hashedPassword
    }));
    
    // Guardar cambios
    await writeFile(filePath, JSON.stringify(data, null, 2));
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200
    });
  } catch (error) {
    console.error('Error reseteando contraseñas:', error);
    return new Response(JSON.stringify({ error: 'Error interno' }), {
      status: 500
    });
  }
}; 