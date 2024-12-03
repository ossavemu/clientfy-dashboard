import Redis from 'ioredis';

// Asegúrate de que estas variables de entorno estén configuradas en tu archivo .env
const REDIS_URL = import.meta.env.REDIS_URL || '';

if (!REDIS_URL) {
  throw new Error('La variable de entorno REDIS_URL no está configurada');
}

export const redis = new Redis(REDIS_URL, {
  tls: {
    rejectUnauthorized: false,
  },
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 5,
});

redis.on('error', (error) => {
  console.error('Error de conexión Redis:', error);
});

redis.on('connect', () => {
  console.log('Conectado exitosamente a Redis');
});
