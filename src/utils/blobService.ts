import {
  BlobClient,
  BlobSASPermissions,
  BlobServiceClient,
  generateBlobSASQueryParameters,
  SASProtocol,
  StorageSharedKeyCredential,
} from '@azure/storage-blob';

const connectionString = import.meta.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = 'user-files';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/csv',
  'application/json',
  'text/markdown',
];

export const blobService = {
  async initialize(container = 'user-files') {
    const blobServiceClient =
      BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(container);
    await containerClient.createIfNotExists();
    return containerClient;
  },

  generateSasUrl(blobClient: BlobClient) {
    const credential = blobClient.credential as StorageSharedKeyCredential;

    const sasOptions = {
      containerName,
      blobName: blobClient.name,
      permissions: BlobSASPermissions.parse('r'),
      startsOn: new Date(),
      expiresOn: new Date(new Date().setMinutes(new Date().getMinutes() + 60)),
      protocol: SASProtocol.Https,
    };

    const sasToken = generateBlobSASQueryParameters(
      sasOptions,
      credential
    ).toString();

    return `${blobClient.url}?${sasToken}`;
  },

  async upload(
    phoneNumber: string,
    fileName: string,
    content: Buffer,
    contentType: string
  ) {
    const containerClient = await this.initialize();
    const blobClient = containerClient.getBlockBlobClient(
      `${phoneNumber}/${fileName}`
    );

    await blobClient.uploadData(content, {
      blobHTTPHeaders: { blobContentType: contentType },
    });

    return {
      fileName: fileName,
      downloadUrl: this.generateSasUrl(blobClient),
    };
  },

  async uploadFile(
    phoneNumber: string,
    fileName: string,
    content: Buffer,
    contentType: string
  ) {
    if (!ALLOWED_MIME_TYPES.includes(contentType)) {
      throw new Error(
        `Tipo de archivo no permitido. Tipos permitidos: ${ALLOWED_MIME_TYPES.join(
          ', '
        )}`
      );
    }

    return this.upload(phoneNumber, fileName, content, contentType);
  },

  async getUserFiles(phoneNumber: string) {
    const containerClient = await this.initialize();
    const files = [];

    const prefix = `${phoneNumber}/`;
    for await (const blob of containerClient.listBlobsFlat({ prefix })) {
      const blobClient = containerClient.getBlockBlobClient(blob.name);
      files.push({
        name: blob.name.replace(prefix, ''),
        originalName: blob.name
          .replace(prefix, '')
          .replace(/(_\d+)(?=\.[^.]+$)/, ''),
        size: blob.properties.contentLength,
        lastModified: blob.properties.lastModified,
        contentType: blob.properties.contentType,
        downloadUrl: this.generateSasUrl(blobClient),
      });
    }

    return files;
  },

  async deleteFile(phoneNumber: string, fileName: string) {
    const containerClient = await this.initialize();
    const blobClient = containerClient.getBlockBlobClient(
      `${phoneNumber}/${fileName}`
    );

    try {
      await blobClient.delete();
      return true;
    } catch (error: unknown) {
      if ((error as any).statusCode === 404) {
        throw new Error('Archivo no encontrado');
      }
      throw error;
    }
  },

  async uploadPrompt(phoneNumber: string, prompt: string) {
    const fileName = `prompt_${Date.now()}.txt`;
    const content = Buffer.from(prompt, 'utf-8');

    const result = await this.upload(
      phoneNumber,
      fileName,
      content,
      'text/plain'
    );

    return {
      fileName: result.fileName,
      downloadUrl: result.downloadUrl,
      prompt,
    };
  },

  async getPrompt(phoneNumber: string) {
    const containerClient = await this.initialize();
    const files = [];

    const prefix = `${phoneNumber}/prompt_`;
    for await (const blob of containerClient.listBlobsFlat({ prefix })) {
      const blobClient = containerClient.getBlockBlobClient(blob.name);
      files.push({
        name: blob.name,
        lastModified: blob.properties.lastModified,
        downloadUrl: this.generateSasUrl(blobClient),
        content: await blobClient.downloadToBuffer(),
      });
    }

    if (files.length === 0) {
      return null;
    }

    const latestPrompt = files.sort((a, b) => {
      return b.lastModified.getTime() - a.lastModified.getTime();
    })[0];

    return {
      fileName: latestPrompt.name,
      downloadUrl: latestPrompt.downloadUrl,
      prompt: latestPrompt.content.toString('utf-8'),
    };
  },

  async getConfigFile(fileName: string) {
    const containerClient = await this.initialize();
    const blobClient = containerClient.getBlockBlobClient(`config/${fileName}`);

    try {
      const downloadResponse = await blobClient.downloadToBuffer();
      return downloadResponse.toString('utf-8');
    } catch (error) {
      if ((error as any).statusCode === 404) {
        return null;
      }
      throw error;
    }
  },

  async getFileFromConfig(fileName: string): Promise<string | null> {
    try {
      const containerClient = await this.initialize('config');
      const blobClient = containerClient.getBlockBlobClient(fileName);

      try {
        const downloadResponse = await blobClient.downloadToBuffer();
        return downloadResponse.toString('utf-8');
      } catch (error: any) {
        if (error.statusCode === 404) {
          return null;
        }
        throw error;
      }
    } catch (error) {
      console.error(`Error getting file ${fileName} from config:`, error);
      return null;
    }
  },

  async renameFile(phoneNumber: string, oldName: string, newName: string) {
    const containerClient = await this.initialize();
    const oldBlobClient = containerClient.getBlockBlobClient(
      `${phoneNumber}/${oldName}`
    );
    const newBlobClient = containerClient.getBlockBlobClient(
      `${phoneNumber}/${newName}`
    );

    // Copiar el blob con el nuevo nombre
    await newBlobClient.beginCopyFromURL(oldBlobClient.url);

    // Eliminar el blob original
    await oldBlobClient.delete();

    return {
      fileName: newName,
      downloadUrl: this.generateSasUrl(newBlobClient),
    };
  },
};
