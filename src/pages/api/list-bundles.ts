import type { APIRoute } from 'astro';
import AWS from 'aws-sdk';

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const lightsail = new AWS.Lightsail();

export const get: APIRoute = async () => {
  try {
    const data = await lightsail.getBundles().promise();
    return new Response(JSON.stringify(data.bundles), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error al obtener bundles:', error);
    return new Response(JSON.stringify({ error: 'Error al obtener bundles' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};
