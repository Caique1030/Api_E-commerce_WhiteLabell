import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ensureDatabaseExists } from './database/create-database';

async function bootstrap() {
  // 🔥 Primeiro: garantir que o database existe
  await ensureDatabaseExists();

  // 🔥 Depois iniciar o Nest
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);


  // Configuração de CORS
  app.enableCors({
    origin: [
      'http://localhost:8000',
      'http://localhost:8080',
      'http://devnology.com:8000',
      'http://in8.com:8000',
      'http://127.0.0.1:8000',
      /^http:\/\/(localhost|127\.0\.0\.1|devnology\.com|in8\.com)(:\d+)?$/,
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Accept,Authorization,X-Client-Domain',
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const port = configService.get('config.app.port') || 3000;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
}

bootstrap();
