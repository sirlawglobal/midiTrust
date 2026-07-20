import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  apiVersion: process.env.API_VERSION || '1.0.0',
  appName: process.env.APP_NAME || 'MediTrust Enterprise API',
  isProduction: process.env.NODE_ENV === 'production',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173').split(','),
  // Public URL of the deployed frontend. Used to build links (e.g. receipt QR/verification
  // URLs) that must be reachable from a patient's phone, not just from this server.
  // Falls back to the first configured CORS origin, then localhost, if unset.
  frontendUrl:
    process.env.FRONTEND_URL ||
    (process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',')[0] : 'http://localhost:5173'),
}));
