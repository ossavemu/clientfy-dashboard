import { BlobServiceClient } from '@azure/storage-blob';
import { config } from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

config(); // Cargar variables de entorno

async function uploadEnvFile() {
  try {
    if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
      throw new Error('AZURE_STORAGE_CONNECTION_STRING no está definida');
    }

    // Leer el archivo .env
    const envPath = path.join(process.cwd(), '.env');
    const envContent = await fs.readFile(envPath, 'utf-8');

    // Conectar con Azure Blob
    const blobServiceClient = BlobServiceClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING
    );
    const containerClient = blobServiceClient.getContainerClient('config');

    // Crear contenedor si no existe (sin especificar acceso público)
    await containerClient.createIfNotExists();

    // Subir el archivo
    const blobClient = containerClient.getBlockBlobClient('.env');
    await blobClient.upload(envContent, envContent.length, {
      blobHTTPHeaders: { blobContentType: 'text/plain' },
    });

    console.log('Archivo .env subido exitosamente');
  } catch (error) {
    console.error('Error al subir archivo .env:', error);
    process.exit(1);
  }
}

// Ejecutar el script
uploadEnvFile();
