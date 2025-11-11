import { NestFactory } from '@nestjs/core';
import { AppModule } from 'src/app.module';
import { SuppliersService } from 'src/suppliers/suppliers.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const suppliersService = app.get(SuppliersService);

  // Criar fornecedores iniciais
  const suppliers = [
    {
      name: 'Fornecedor Brasileiro',
      type: 'brazilian',
      apiUrl: 'http://616d6bdb6dacbb001794ca17.mockapi.io/devnology/brazilian_provider',
    },
    {
      name: 'Fornecedor Europeu',
      type: 'european',
      apiUrl: 'http://616d6bdb6dacbb001794ca17.mockapi.io/devnology/european_provider',
    },
  ];

  for (const supplier of suppliers) {
    try {
      await suppliersService.create(supplier);
      console.log(`Fornecedor "${supplier.name}" criado com sucesso!`);
    } catch (error) {
      console.log(`Erro ao criar fornecedor "${supplier.name}":`, error.message);
    }
  }

  await app.close();
}

bootstrap();
