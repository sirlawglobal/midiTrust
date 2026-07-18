import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET || 'super-secret-meditrust-jwt-access-key-change-in-prod',
  expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'super-secret-meditrust-jwt-refresh-key-change-in-prod',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  issuer: process.env.JWT_ISSUER || 'meditrust.hospital.enterprise',
  audience: process.env.JWT_AUDIENCE || 'meditrust.clients',
}));
