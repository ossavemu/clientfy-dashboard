import type { APIRoute } from 'astro';
import axios from 'axios';
import { NodeSSH } from 'node-ssh';
import { redis } from '../../config/redis';

// Tipos para la API de DigitalOcean
interface DONetwork {
  ip_address: string;
  type: string;
  netmask: string;
  gateway: string;
}

interface DODroplet {
  id: number;
  name: string;
  status: string;
  created_at: string;
  networks: {
    v4: DONetwork[];
    v6: DONetwork[];
  };
}

interface DOResponse {
  droplet: DODroplet;
}

// Configuración para la API de DigitalOcean
const DO_API_URL = 'https://api.digitalocean.com/v2';
const headers = {
  Authorization: `Bearer ${process.env.DIGITALOCEAN_TOKEN}`,
  'Content-Type': 'application/json',
};

// Función auxiliar para esperar y reintentar
async function retryWithDelay<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 5000
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    await new Promise((resolve) => setTimeout(resolve, delay));
    return retryWithDelay(fn, retries - 1, delay);
  }
}

// Modificar la función getExistingDroplet para incluir reintentos
async function getExistingDroplet(
  numberphone: string
): Promise<DODroplet | null> {
  return retryWithDelay(async () => {
    try {
      const response = await axios.get(
        `${DO_API_URL}/droplets?tag_name=${numberphone}`,
        {
          headers,
          timeout: 10000, // 10 segundos de timeout
        }
      );
      return response.data.droplets[0] || null;
    } catch (error) {
      console.error('Error al verificar droplet existente:', error);
      return null;
    }
  }, 3);
}

// Añadir tipos para el error SSH y dropletId
interface SSHError extends Error {
  message: string;
  level?: string;
}

// Modificar la función waitForSSH para ser más resiliente
async function waitForSSH(ip: string, maxAttempts = 60): Promise<boolean> {
  const ssh = new NodeSSH();
  let attempts = 0;
  const waitTime = 10000;

  while (attempts < maxAttempts) {
    try {
      console.log(
        `Intento de conexión SSH ${
          attempts + 1
        }/${maxAttempts} - Tiempo restante: ${
          (maxAttempts - attempts) * 10
        } segundos`
      );

      await ssh.connect({
        host: ip,
        username: 'root',
        password: process.env.DIGITALOCEAN_SSH_PASSWORD,
        tryKeyboard: true,
        timeout: 30000, // Aumentar timeout a 30 segundos
        readyTimeout: 40000, // Aumentar readyTimeout a 40 segundos
      });

      // Verificar que el sistema esté realmente listo
      const { stdout: systemCheck } = await ssh.execCommand('whoami');
      if (systemCheck.trim() === 'root') {
        console.log('Conexión SSH establecida exitosamente');
        await ssh.dispose();
        return true;
      }

      await ssh.dispose();
    } catch (error: unknown) {
      const sshError = error as SSHError;
      console.log(`Intento fallido (${attempts + 1}): ${sshError.message}`);

      if (attempts === maxAttempts - 1) {
        console.error('Error crítico en la conexión SSH:', sshError);
      }

      attempts++;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  return false;
}

async function initializeInstance(ip: string): Promise<void> {
  const ssh = new NodeSSH();

  try {
    await ssh.connect({
      host: ip,
      username: 'root',
      password: process.env.DIGITALOCEAN_SSH_PASSWORD,
      tryKeyboard: true,
    });

    // Comandos iniciales
    let commands = [
      // Verificar si el swap ya está activo antes de intentar activarlo
      'if ! swapon -s | grep -q /swapfile; then sudo swapon /swapfile || true; fi',
      // Verificar si el directorio existe, si no, clonarlo
      'if [ ! -d "/root/ClientFyAdmin" ]; then git clone https://github.com/ossavemu/ClientFyAdmin.git /root/ClientFyAdmin; fi',
      'cd /root/ClientFyAdmin',
      // Inicializar git si no existe
      'git init || true',
      // Configurar git
      'git config --global --add safe.directory /root/ClientFyAdmin || true',
      'git config core.fileMode false || true',
      // Configurar el repositorio remoto
      'git remote remove origin || true',
      'git remote add origin https://github.com/ossavemu/ClientFyAdmin.git || true',
      // Obtener los últimos cambios
      'git fetch origin || true',
      'git checkout master || git checkout -b master || true',
      'git pull origin master || true',
      // Asegurarnos de que pnpm está instalado
      'command -v pnpm || npm install -g pnpm',
      // Instalar solo dependencias faltantes sin borrar las existentes
      'cd /root/ClientFyAdmin && pnpm install --no-frozen-lockfile',
      // Eliminar la carpeta bot_sessions y el archivo QR
      'rm -rf /root/ClientFyAdmin/bot_sessions',
      'rm -f /root/ClientFyAdmin/bot.qr.png',
      // Reiniciar la aplicación
      'pkill -f "pnpm start" || true',
      'screen -S clientfy -d -m bash -c "cd /root/ClientFyAdmin && pnpm start > app.log 2>&1"',
    ];

    // Ejecutar comandos en secuencia
    for (const cmd of commands) {
      console.log(`Ejecutando: ${cmd}`);
      const result = await ssh.execCommand(cmd);
      console.log('STDOUT:', result.stdout);
      console.log('STDERR:', result.stderr);

      // Si hay un error en algún comando crítico, lanzar una excepción
      // Ignorar errores en comandos que incluyen || true
      if (result.stderr && !cmd.includes('|| true')) {
        throw new Error(`Error ejecutando comando ${cmd}: ${result.stderr}`);
      }

      // Agregar un pequeño delay entre comandos
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // Verificar la instalación
    console.log('Verificando la instalación...');
    const checkGit = await ssh.execCommand(
      'cd /root/ClientFyAdmin && git status'
    );
    console.log('Git status:', checkGit.stdout);

    // Aumentar el tiempo de espera para el inicio del servidor
    console.log('Esperando a que el servidor inicie...');
    await new Promise((resolve) => setTimeout(resolve, 20000));

    const processCheck = await ssh.execCommand(
      'ps aux | grep "pnpm start" | grep -v grep'
    );
    if (!processCheck.stdout) {
      const logCheck = await ssh.execCommand(
        'tail -n 20 /root/ClientFyAdmin/app.log'
      );
      console.log('Últimas líneas del log:', logCheck.stdout);
      throw new Error('El proceso no está corriendo');
    }

    console.log('Proceso encontrado:', processCheck.stdout);
    console.log('Inicialización completada exitosamente');
  } catch (error) {
    console.error('Error en la inicialización:', error);
    throw error;
  } finally {
    ssh.dispose();
  }
}

async function getSnapshotId(snapshotName: string): Promise<number> {
  try {
    const response = await axios.get(
      `${DO_API_URL}/snapshots?resource_type=droplet`,
      { headers }
    );
    const snapshots = response.data.snapshots;
    const snapshot = snapshots.find((s: any) => s.name === snapshotName);

    if (!snapshot) {
      throw new Error(`No se encontró la snapshot ${snapshotName}`);
    }

    return parseInt(snapshot.id, 10); // Convertir a número
  } catch (error) {
    console.error('Error al obtener ID de snapshot:', error);
    throw error;
  }
}

export const POST: APIRoute = async ({ request }) => {
  const { numberphone, provider = 'baileys' } = await request.json();

  if (!numberphone) {
    return new Response(JSON.stringify({ error: 'numberphone es requerido' }), {
      status: 400,
    });
  }

  const instanceName = `bot-${numberphone}`;

  try {
    // Verificar si ya existe un droplet para este número
    const existingDroplet = await getExistingDroplet(numberphone);
    let droplet: DODroplet | undefined;
    let dropletId: number | undefined;
    let ipAddress: string | undefined;

    if (existingDroplet) {
      console.log('Instancia existente encontrada, verificando estado...');
      droplet = existingDroplet;
      dropletId = existingDroplet.id;
      ipAddress = existingDroplet.networks.v4.find(
        (network: DONetwork) => network.type === 'public'
      )?.ip_address;

      if (!ipAddress) {
        throw new Error('No se pudo obtener la IP del droplet existente');
      }
    } else {
      // Crear nuevo droplet si no existe
      console.log('Creando nueva instancia...');

      // Script para configurar la contraseña root
      const userData = `#!/bin/bash
# Configurar contraseña root
echo "root:${process.env.DIGITALOCEAN_SSH_PASSWORD}" | chpasswd
sed -i 's/PermitRootLogin no/PermitRootLogin yes/' /etc/ssh/sshd_config
sed -i 's/PasswordAuthentication no/PasswordAuthentication yes/' /etc/ssh/sshd_config
systemctl restart sshd

# Instalar screen
apt-get update
apt-get install -y screen`;

      const createDropletResponse = await axios.post(
        `${DO_API_URL}/droplets`,
        {
          name: instanceName,
          region: 'sfo3',
          size: 's-1vcpu-512mb-10gb',
          image: 172586238,
          backups: false,
          ipv6: false,
          monitoring: true,
          tags: [numberphone, provider],
          user_data: userData, // Agregamos el script de inicialización
        },
        { headers }
      );

      dropletId = createDropletResponse.data.droplet.id;

      // Esperar a que el droplet esté activo
      console.log('Esperando que el droplet esté activo...');
      let isRunning = false;
      let attempts = 0;
      const maxAttempts = 30;
      const totalTime = maxAttempts * 2;

      while (!isRunning && attempts < maxAttempts) {
        try {
          console.log(
            `Verificando estado... (${
              attempts + 1
            }/${maxAttempts}) - Tiempo restante: ${
              totalTime - attempts * 5
            } segundos`
          );

          if (!dropletId) {
            throw new Error('ID del droplet no definido');
          }

          const dropletResponse = await retryWithDelay(() =>
            axios.get(`${DO_API_URL}/droplets/${dropletId}`, {
              headers,
              timeout: 10000,
            })
          );

          droplet = dropletResponse.data.droplet;

          if (droplet?.status === 'active') {
            isRunning = true;
            // Aumentar significativamente el tiempo de espera después de activo
            console.log(
              'Droplet activo, esperando 90 segundos para inicialización completa...'
            );
            await new Promise((resolve) => setTimeout(resolve, 90000)); // 90 segundos
          } else {
            attempts++;
            await new Promise((resolve) => setTimeout(resolve, 5000));
          }
        } catch (error: unknown) {
          const axiosError = error as Error;
          console.error(
            `Error al verificar estado (intento ${attempts + 1}):`,
            axiosError.message
          );
          attempts++;
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }

      if (!isRunning || !droplet) {
        throw new Error('Timeout esperando que la instancia esté activa');
      }

      ipAddress = droplet.networks.v4.find(
        (network: DONetwork) => network.type === 'public'
      )?.ip_address;

      if (!ipAddress) {
        throw new Error('No se pudo obtener la IP del droplet');
      }

      // **Inicio de los cambios para modificar el archivo .env**
      const ssh = new NodeSSH();
      await ssh.connect({
        host: ipAddress,
        username: 'root',
        password: process.env.DIGITALOCEAN_SSH_PASSWORD,
        tryKeyboard: true,
      });

      const providerLower = provider.toLowerCase();

      // Primero leemos el contenido actual del archivo
      const { stdout: currentEnv } = await ssh.execCommand(
        'cat /root/ClientFyAdmin/.env'
      );

      // Creamos un array con las líneas del archivo
      const envLines = currentEnv.split('\n');

      // Función para actualizar o agregar una variable
      const updateEnvVar = (name: string, value: string) => {
        const index = envLines.findIndex((line) => line.startsWith(`${name}=`));
        if (index !== -1) {
          envLines[index] = `${name}=${value}`;
        } else {
          envLines.push(`${name}=${value}`);
        }
      };

      // Actualizamos las variables según el proveedor
      updateEnvVar('PROVIDER', providerLower);

      if (providerLower === 'baileys') {
        updateEnvVar('P_NUMBER', numberphone);
      } else if (providerLower === 'meta') {
        updateEnvVar('numberId', numberphone);
      }

      // Escribimos el nuevo contenido al archivo
      const newEnv = envLines.join('\n');
      await ssh.execCommand(`echo '${newEnv}' > /root/ClientFyAdmin/.env`);

      // Verificamos que los cambios se hayan aplicado
      const { stdout: verification } = await ssh.execCommand(
        'cat /root/ClientFyAdmin/.env'
      );
      console.log('Contenido actualizado del .env:', verification);

      await ssh.dispose();
      // **Fin de los cambios para modificar el archivo .env**
    }

    // Intentar conexión SSH e inicialización para ambos casos
    console.log('Verificando conexión SSH...');
    console.log('Este proceso puede tardar hasta 10 minutos...');
    const sshReady = await waitForSSH(ipAddress);

    if (!sshReady) {
      console.error(
        'No se pudo establecer conexión SSH. Manteniendo la instancia para diagnóstico.'
      );
      // No eliminamos la instancia automáticamente para poder diagnosticar el problema
      throw new Error(
        'No se pudo establecer conexión SSH después de varios intentos. La instancia se ha mantenido para diagnóstico.'
      );
    }

    // Inicializar la instancia
    console.log('Inicializando instancia...');
    await initializeInstance(ipAddress);

    const instanceInfo = {
      instanceName: instanceName,
      ip: ipAddress,
      state: droplet.status,
      created: existingDroplet
        ? existingDroplet.created_at
        : new Date().toISOString(),
      provider: provider,
      numberphone: numberphone,
      dropletId: droplet.id,
    };

    // Actualizar estado en Redis
    const state = (await redis.get('whatsapp:state')) || '{"instances":[]}';
    const currentState = JSON.parse(state);
    // Remover instancia anterior si existe
    currentState.instances = currentState.instances.filter(
      (i: any) => i.numberphone !== numberphone
    );
    currentState.instances.push(instanceInfo);
    await redis.set('whatsapp:state', JSON.stringify(currentState));

    return new Response(
      JSON.stringify({
        success: true,
        instance: instanceInfo,
        isExisting: !!existingDroplet,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error detallado:', error);
    throw error;
  }
};
