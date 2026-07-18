import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger as PinoLogger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { GlobalHttpExceptionFilter } from './common/filters/global-http-exception.filter';
import { MongoExceptionFilter } from './common/filters/mongo-exception.filter';
import { TransformResponseInterceptor } from './common/interceptors/transform-response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import { SanitizeInputPipe } from './common/pipes/sanitize-input.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true, bufferLogs: true });
  app.useLogger(app.get(PinoLogger));
  
  const logger = new Logger('Bootstrap');
  const configService = app.get(ConfigService);

  const port = configService.get<number>('app.port') || 3000;
  const apiPrefix = configService.get<string>('app.apiPrefix') || 'api/v1';

  // Security Middleware
  app.use(helmet());
  app.enableCors({
    origin: configService.get<string[]>('app.corsOrigins') || '*',
    credentials: true,
  });

  // Global Prefix
  app.setGlobalPrefix(apiPrefix);

  // Global Interceptors
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TimeoutInterceptor(30000),
    new TransformResponseInterceptor(),
  );

  // Global Filters
  app.useGlobalFilters(
    new GlobalHttpExceptionFilter(),
    new MongoExceptionFilter(),
  );

  // Global Pipes
  app.useGlobalPipes(
    new SanitizeInputPipe(),
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger Documentation Setup
  const swaggerConfig = new DocumentBuilder()
    .setTitle('MediTrust Enterprise Healthcare & Fintech API')
    .setDescription(
      'Production-ready backend API for hospital billing, Monnify dynamic virtual accounts, and payment verification.',
    )
    .setVersion(configService.get<string>('app.apiVersion') || '1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your JWT access token',
        in: 'header',
      },
      'bearer',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(port);
  logger.log(`🚀 MediTrust Enterprise API is running on: http://localhost:${port}/${apiPrefix}`);
  logger.log(`📚 Swagger documentation is live at: http://localhost:${port}/api/docs`);
}

bootstrap();
