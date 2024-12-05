import { BlobServiceClient } from '@azure/storage-blob';

import fetch from 'node-fetch';
const CALENDAR_CREDENTIALS_URL =
  'https://raw.githubusercontent.com/ossavemu/ClientFyAdmin/refs/heads/master/clientfycalendar.json';
async function uploadCredentials() {
  try {
    // Verificar que tenemos las variables necesarias
    if (!CALENDAR_CREDENTIALS_URL) {
      throw new Error('CALENDAR_CREDENTIALS_URL no está definida en .env');
    }
    if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
      throw new Error(
        'AZURE_STORAGE_CONNECTION_STRING no está definida en .env'
      );
    }

    console.log('Obteniendo credenciales de:', CALENDAR_CREDENTIALS_URL);

    // 1. Obtener las credenciales del repositorio
    const response = await fetch(CALENDAR_CREDENTIALS_URL, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'ClientFy-Script',
      },
    });

    if (!response.ok) {
      throw new Error(
        `Error al obtener credenciales: ${response.status} ${response.statusText}`
      );
    }

    const credentials = await response.json();
    console.log('Credenciales obtenidas correctamente');

    // 2. Conectar con Azure Blob
    const blobServiceClient = BlobServiceClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING
    );
    const containerClient = blobServiceClient.getContainerClient('config');
    await containerClient.createIfNotExists();
    console.log('Contenedor "config" verificado/creado');

    // 3. Subir el archivo
    const blobClient = containerClient.getBlockBlobClient(
      'CLIENTFY_CREDENTIALS.json'
    );
    const data = JSON.stringify(credentials, null, 2);

    await blobClient.upload(data, data.length, {
      blobHTTPHeaders: { blobContentType: 'application/json' },
    });

    console.log('Credenciales subidas exitosamente a Azure Blob');
  } catch (error) {
    console.error('Error al subir credenciales:', error);
    process.exit(1);
  }
}

uploadCredentials();
