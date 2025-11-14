import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ClientsService } from '../clients/clients.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const clientsService = app.get(ClientsService);

    const clients = [
      {
        name: 'Localhost Client',
        domain: 'localhost:3000',
        primaryColor: '#2ecc71',
        secondaryColor: '#27ae60',
      },
      {
        name: 'Devnology',
        domain: 'devnology.com:3000',
        primaryColor: '#2ecc71',
        secondaryColor: '#27ae60',
      },
      {
        name: 'IN8',
        domain: 'in8.com:3000',
        primaryColor: '#8e44ad',
        secondaryColor: '#9b59b6',
      },
    ];

    console.log('🚀 Iniciando criação de clientes...\n');

    for (const clientData of clients) {
      try {
        try {
          await clientsService.findByDomain(clientData.domain);
          console.log(
            `⚠️  Cliente "${clientData.name}" já existe no domínio ${clientData.domain}!`,
          );
          continue;
        } catch {
        }

        const client = await clientsService.create(clientData);
        console.log(`✅ Cliente "${client.name}" criado com sucesso!`);
        console.log(`   🌐 Domínio: ${client.domain}`);
        console.log(`   🎨 Cor primária: ${client.primaryColor}`);
        console.log(`   🎨 Cor secundária: ${client.secondaryColor}\n`);
      } catch (error) {
        console.error(
          `❌ Erro ao criar cliente "${clientData.name}":`,
          error instanceof Error ? error.message : String(error),
        );
      }
    }
  } catch (error) {
    console.error(
      '❌ Erro geral:',
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    await app.close();
  }
}

bootstrap().catch(console.error);
