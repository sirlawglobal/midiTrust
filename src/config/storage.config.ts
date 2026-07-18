import { registerAs } from '@nestjs/config';

export default registerAs('storage', () => ({
  provider: process.env.STORAGE_PROVIDER || 'cloudinary',
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'dzoewlcdy',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    url: process.env.CLOUDINARY_URL || '',
  },
  maxFileSizeMb: parseInt(process.env.STORAGE_MAX_FILE_SIZE_MB || '10', 10),
  allowedMimeTypes: (process.env.STORAGE_ALLOWED_MIME_TYPES || 'image/jpeg,image/png,image/webp,application/pdf').split(','),
  r2: {
    accountId: process.env.R2_ACCOUNT_ID || 'dummy_account_id',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || 'dummy_access_key',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || 'dummy_secret_key',
    bucketName: process.env.R2_BUCKET_NAME || 'meditrust-receipts',
    publicDomain: process.env.R2_PUBLIC_DOMAIN || 'https://pub-dummy.r2.dev',
  },
}));
