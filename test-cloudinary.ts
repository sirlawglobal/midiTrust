import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { StorageService } from './src/infrastructure/storage/storage.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const storage = app.get(StorageService);

  const buffer = Buffer.from('dummy pdf content');
  const result = await storage.uploadPdf(buffer, 'test-receipt.pdf');
  
  console.log('CLOUDINARY URL:', result.url);
  await app.close();
}

bootstrap();
