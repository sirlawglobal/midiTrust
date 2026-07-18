import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/meditrust_db',
  maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '50', 10),
  minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE || '10', 10),
  socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT_MS || '45000', 10),
  connectTimeoutMS: parseInt(process.env.MONGODB_CONNECT_TIMEOUT_MS || '30000', 10),
  retryAttempts: parseInt(process.env.MONGODB_RETRY_ATTEMPTS || '5', 10),
  retryDelay: parseInt(process.env.MONGODB_RETRY_DELAY || '3000', 10),
}));
