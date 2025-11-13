import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';
import { ClientsService } from '../clients/clients.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const usersService = app.get(UsersService);
    const clientsService = app.get(ClientsService);

    // Primeiro, garantir que existe um cliente para associar o admin
    let defaultClient;
    try {
      defaultClient = await clientsService.findByDomain('localhost:3000');
    } catch {
      // Se não existir, criar o cliente padrão
      console.log('Criando cliente padrão...');
      defaultClient = await clientsService.create({
        name: 'Localhost Client',
        domain: 'localhost:3000',
        primaryColor: '#2ecc71',
        secondaryColor: '#27ae60',
      });
      console.log('Cliente padrão criado com sucesso!');
    }

    // Verificar se o admin já existe
        // Verificar se o admin já existe
    let existingAdmin;
    try {
      existingAdmin = await usersService.findByEmail('admin@example.com');
      if (existingAdmin) {
        console.log('Usuário administrador já existe!');
        console.log('Email:', existingAdmin.email || '');
        return;
      }
    } catch {
      // Admin não existe, criar um novo
    }

    // Criar usuário admin
    const admin = await usersService.create({
      name: 'Administrador',
      email: 'admin@example.com',
      password: 'admin123',
      role: 'admin',
      clientId: defaultClient.id,
    });

    console.log('✅ Usuário administrador criado com sucesso!');
    console.log('📧 Email:', admin.email);
    console.log('🔑 Senha: admin123');
    console.log('🏢 Cliente:', defaultClient.name);
  } catch (error) {
    console.error(
      '❌ Erro ao criar usuário administrador:',
      error instanceof Error ? error.message : String(error),
    );
    if (error && typeof error === 'object' && 'detail' in error) {
      console.error(
        'Detalhes:',
        error && typeof error === 'object' && 'detail' in error,
      );
    }
  } finally {
    await app.close();
  }
}

bootstrap().catch(console.error);
