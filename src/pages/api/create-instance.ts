import type { APIRoute } from 'astro';
import AWS from 'aws-sdk';
import { redis } from '../../config/redis';

const lightsail = new AWS.Lightsail({
  region: 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

export const POST: APIRoute = async ({ request }) => {
  const { numberphone } = await request.json();

  if (!numberphone) {
    return new Response(JSON.stringify({ error: 'numberphone es requerido' }), {
      status: 400,
    });
  }

  const instanceName = `test-server-${numberphone}`;

  const params = {
    instanceNames: [instanceName],
    availabilityZone: 'us-east-1a',
    blueprintId: 'amazon_linux_2023',
    bundleId: 'nano_1_0',
    userData: `#!/bin/bash
      yum update -y
      yum install -y nodejs
      yum install -y ffmpeg
      curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
      export NVM_DIR="$HOME/.nvm"
      [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
      nvm install 18
      nvm use 18`,
  };

  try {
    // Crear la instancia
    await lightsail.createInstances(params).promise();

    // Esperar y verificar el estado manualmente
    let isRunning = false;
    let attempts = 0;
    const maxAttempts = 30;

    while (!isRunning && attempts < maxAttempts) {
      const describeParams = { instanceName: instanceName };
      const data = await lightsail.getInstance(describeParams).promise();

      if (data.instance?.state?.name === 'running') {
        isRunning = true;
      } else {
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 2000)); // esperar 2 segundos
      }
    }

    if (!isRunning) {
      throw new Error('Timeout waiting for instance to be running');
    }

    // Obtener la información final de la instancia
    const describeParams = { instanceName: instanceName };
    const data = await lightsail.getInstance(describeParams).promise();

    const instanceInfo = {
      instanceName: instanceName,
      ip: data.instance?.publicIpAddress,
      state: data.instance?.state?.name,
      created: new Date().toISOString(),
    };

    const state = (await redis.get('whatsapp:state')) || '{"instances":[]}';
    const currentState = JSON.parse(state);
    currentState.instances.push(instanceInfo);
    await redis.set('whatsapp:state', JSON.stringify(currentState));

    return new Response(
      JSON.stringify({
        success: true,
        instance: instanceInfo,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error al crear la instancia:', error);
    return new Response(
      JSON.stringify({
        error: 'Error al crear la instancia',
        details: error instanceof Error ? error.message : 'Unknown error',
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
