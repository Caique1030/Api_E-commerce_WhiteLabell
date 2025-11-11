import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ClientsService } from '../clients/clients.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const clientsService = app.get(ClientsService);

  // Criar clientes iniciais
  const clients = [
    {
      name: 'Loja A',
      domain: 'loja-a.localhost',
      primaryColor: '#FF5722',
      secondaryColor: '#FFC107',
    },
    {
      name: 'Loja B',
      domain: 'loja-b.localhost',
      primaryColor: '#2196F3',
      secondaryColor: '#4CAF50',
    },
  ];

  for (const client of clients) {
    try {
      await clientsService.create(client);
      console.log(`Cliente "${client.name}" criado com sucesso!`);
    } catch (error) {
      console.log(`Erro ao criar cliente "${client.name}":`, error.message);
    }
  }

  await app.close();
}

bootstrap();
