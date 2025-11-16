import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.useWebSocketAdapter(new IoAdapter(app));

  // CORS configurado para aceitar requisições de diferentes domínios
  app.enableCors({
    origin: [
      'http://localhost:8000',
      'http://localhost:8080',
      'http://devnology.com:8000',
      'http://in8.com:8000',
      'http://127.0.0.1:8000',
      // Para desenvolvimento, você pode usar uma função
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
  console.log(
    `📡 WebSocket Server available at: ws://localhost:${port}/events`,
  );
}
bootstrap();
