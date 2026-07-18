import { registerAs } from '@nestjs/config';

export default registerAs('monnify', () => ({
  apiKey: process.env.MONNIFY_API_KEY || 'MK_TEST_XXXXXXXX',
  secretKey: process.env.MONNIFY_SECRET_KEY || 'SK_TEST_XXXXXXXX',
  contractCode: process.env.MONNIFY_CONTRACT_CODE || '1234567890',
  baseUrl: process.env.MONNIFY_BASE_URL || 'https://sandbox.monnify.com',
  webhookSecret: process.env.MONNIFY_WEBHOOK_SECRET || process.env.MONNIFY_SECRET_KEY || 'SK_TEST_XXXXXXXX',
  defaultCurrency: 'NGN',
  virtualAccountExpiresHours: parseInt(process.env.MONNIFY_VA_EXPIRES_HOURS || '24', 10),
}));
