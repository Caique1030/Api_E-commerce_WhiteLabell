import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const usersService = app.get(UsersService);

  // Criar usuário admin
  try {
    const admin = await usersService.create({
      name: 'Administrador',
      email: 'admin@example.com',
      password: 'admin123',
      role: 'admin',
    });

    console.log('Usuário administrador criado com sucesso!');
    console.log('Email:', admin.email);
    console.log('Senha: admin123');
  } catch (error) {
    console.log('Erro ao criar usuário administrador:', error.message);
  }

  await app.close();
}

bootstrap();
