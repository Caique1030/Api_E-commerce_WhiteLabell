import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsService } from '../clients/clients.service';
import { SuppliersService } from '../suppliers/suppliers.service';
import { UsersService } from '../users/users.service';
import { InitializationOptions } from '../interfaces/initialization-options.interface';

@Injectable()
export class InitializationService implements OnApplicationBootstrap {
  private readonly logger = new Logger(InitializationService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly clientsService: ClientsService,
    private readonly suppliersService: SuppliersService,
    private readonly usersService: UsersService,
  ) {}

  async onApplicationBootstrap() {
    const options = this.getInitializationOptions();
    
    if (!options.enabled) {
      this.logger.log('Inicialização automática desabilitada');
      return;
    }

    await this.initializeDatabase(options);
  }

  private getInitializationOptions(): InitializationOptions {
    return {
      enabled: this.configService.get('DB_INITIALIZE') !== 'false',
      force: this.configService.get('DB_FORCE_INIT') === 'true',
      verbose: this.configService.get('DB_INIT_VERBOSE') !== 'false',
    };
  }

  private async initializeDatabase(options: InitializationOptions) {
    this.logger.log('🚀 Iniciando verificação e população do banco de dados...');

    try {
      await this.initializeClients(options);
      await this.initializeSuppliers(options);
      await this.initializeAdmin(options);

      this.logger.log('🎉 Verificação e população do banco concluída!');
    } catch (error) {
      this.logger.error('❌ Erro durante a inicialização:', error);
    }
  }

  private async initializeClients(options: InitializationOptions) {
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

    if (options.verbose) {
      this.logger.log('🔄 Verificando clientes...');
    }

    for (const clientData of clients) {
      try {
        // Verificar se o cliente já existe
        const existingClient = await this.clientsService
          .findByDomain(clientData.domain)
          .catch(() => null);

        if (existingClient && !options.force) {
          if (options.verbose) {
            this.logger.log(`⚠️ Cliente "${clientData.name}" já existe!`);
          }
          continue;
        }

        if (existingClient && options.force) {
          // Opcional: atualizar cliente existente
          await this.clientsService.update(existingClient.id, clientData);
          if (options.verbose) {
            this.logger.log(`🔄 Cliente "${clientData.name}" atualizado!`);
          }
        } else {
          const client = await this.clientsService.create(clientData);
          if (options.verbose) {
            this.logger.log(`✅ Cliente "${client.name}" criado com sucesso!`);
          }
        }
      } catch (error) {
        this.logger.error(`❌ Erro ao processar cliente "${clientData.name}":`, error);
      }
    }
  }

  private async initializeSuppliers(options: InitializationOptions) {
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

    if (options.verbose) {
      this.logger.log('🔄 Verificando fornecedores...');
    }

    for (const supplierData of suppliers) {
      try {
        // Verificar se o fornecedor já existe
        const existingSuppliers = await this.suppliersService.findAll();
        const existingSupplier = existingSuppliers.find(s => s.name === supplierData.name);

        if (existingSupplier && !options.force) {
          if (options.verbose) {
            this.logger.log(`⚠️ Fornecedor "${supplierData.name}" já existe!`);
          }
          continue;
        }

        if (existingSupplier && options.force) {
          // Opcional: atualizar fornecedor existente
          await this.suppliersService.update(existingSupplier.id, supplierData);
          if (options.verbose) {
            this.logger.log(`🔄 Fornecedor "${supplierData.name}" atualizado!`);
          }
        } else {
          const supplier = await this.suppliersService.create(supplierData);
          if (options.verbose) {
            this.logger.log(`✅ Fornecedor "${supplier.name}" criado com sucesso!`);
          }
        }
      } catch (error) {
        this.logger.error(`❌ Erro ao processar fornecedor "${supplierData.name}":`, error);
      }
    }
  }

  private async initializeAdmin(options: InitializationOptions) {
    if (options.verbose) {
      this.logger.log('🔄 Verificando usuário administrador...');
    }

    try {
      // Verificar se o admin já existe
      const existingAdmin = await this.usersService
        .findByEmail('admin@example.com')
        .catch(() => null);

      if (existingAdmin && !options.force) {
        if (options.verbose) {
          this.logger.log('⚠️ Usuário administrador já existe!');
        }
        return;
      }

      // Garantir que existe um cliente para associar o admin
      let defaultClient;
      try {
        defaultClient = await this.clientsService.findByDomain('localhost:3000');
      } catch {
        if (options.verbose) {
          this.logger.log('Criando cliente padrão...');
        }
        defaultClient = await this.clientsService.create({
          name: 'Localhost Client',
          domain: 'localhost:3000',
          primaryColor: '#2ecc71',
          secondaryColor: '#27ae60',
        });
        if (options.verbose) {
          this.logger.log('✅ Cliente padrão criado com sucesso!');
        }
      }

      if (existingAdmin && options.force) {
        // Atualizar admin existente
        await this.usersService.update(existingAdmin.id, {
          name: 'Administrador',
          password: 'admin123',
          role: 'admin',
          clientId: defaultClient.id,
        });
        if (options.verbose) {
          this.logger.log('🔄 Usuário administrador atualizado!');
        }
      } else {
        // Criar usuário admin
        const admin = await this.usersService.create({
          name: 'Administrador',
          email: 'admin@example.com',
          password: 'admin123',
          role: 'admin',
          clientId: defaultClient.id,
        });

        if (options.verbose) {
          this.logger.log('✅ Usuário administrador criado com sucesso!');
          this.logger.log(`📧 Email: ${admin.email}`);
          this.logger.log(`🔑 Senha: admin123`);
          this.logger.log(`🏢 Cliente: ${defaultClient.name}`);
        }
      }
    } catch (error) {
      this.logger.error('❌ Erro ao criar usuário administrador:', error);
    }
  }
}