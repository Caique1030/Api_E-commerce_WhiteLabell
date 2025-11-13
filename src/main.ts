import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io'; // ← ADICIONE ESTA LINHA

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // 🔥 ADICIONE ESTAS 2 LINHAS (ANTES do CORS):
  // Configurar WebSocket Adapter para Socket.IO
  app.useWebSocketAdapter(new IoAdapter(app));

  // Habilitar CORS
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type,Accept,Authorization',
    credentials: true,
  });

  // Adicionar prefixo global para API
  app.setGlobalPrefix('api');

  // Configurar validação de DTOs
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
  console.log(`📡 WebSocket Server available at: ws://localhost:${port}/events`);
}
bootstrap();