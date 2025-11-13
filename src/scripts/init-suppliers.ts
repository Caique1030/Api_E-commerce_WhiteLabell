import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SuppliersService } from '../suppliers/suppliers.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const suppliersService = app.get(SuppliersService);

    // Fornecedores a serem criados
    const suppliers = [
      {
        name: 'Fornecedor Brasileiro',
        type: 'brazilian',
        apiUrl:
          'http://616d6bdb6dacbb001794ca17.mockapi.io/devnology/brazilian_provider',
      },
      {
        name: 'Fornecedor Europeu',
        type: 'european',
        apiUrl:
          'http://616d6bdb6dacbb001794ca17.mockapi.io/devnology/european_provider',
      },
    ];

    console.log('🚀 Iniciando criação de fornecedores...\n');

    for (const supplierData of suppliers) {
      try {
        // Verificar se o fornecedor já existe
        const existingSuppliers = await suppliersService.findAll();
        const exists = existingSuppliers.find(
          (s) => s.name === supplierData.name,
        );

        if (exists) {
          console.log(`⚠️  Fornecedor "${supplierData.name}" já existe!`);
          continue;
        }

        const supplier = await suppliersService.create(supplierData);
        console.log(`✅ Fornecedor "${supplier.name}" criado com sucesso!`);
        console.log(`   🔗 URL: ${supplier.apiUrl}`);
        console.log(`   🏷️  Tipo: ${supplier.type}\n`);
      } catch (error: any) {
        console.error(
          `❌ Erro ao criar fornecedor "${supplierData.name}":`,
          error instanceof Error ? error.message : String(error),
        );
      }
    }
  } catch (error: any) {
    console.error(
      '❌ Erro geral:',
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    await app.close();
  }
}

bootstrap().catch(console.error);
