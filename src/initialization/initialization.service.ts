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
      this.logger.log('Autostart disabled');
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
    this.logger.log(' Starting database verification and population...');

    try {
      await this.initializeClients(options);
      await this.initializeSuppliers(options);
      await this.initializeAdmin(options);

      this.logger.log('Bank verification and population completed!');
    } catch (error) {
      this.logger.error('❌ Erro durante a inicialização:', error);
    }
  }

  private async initializeClients(options: InitializationOptions) {
    const clients = [
      {
        name: 'Localhost Client',
        domain: 'localhost',
        primaryColor: '#2ecc71',
        secondaryColor: '#27ae60',
      },
      {
        name: 'Devnology',
        domain: 'devnology.com',
        primaryColor: '#2ecc71',
        secondaryColor: '#27ae60',
      },
      {
        name: 'IN8',
        domain: 'in8.com',
        primaryColor: '#8e44ad',
        secondaryColor: '#9b59b6',
      },
    ];

    if (options.verbose) {
      this.logger.log(' Checking customers...');
    }

    for (const clientData of clients) {
      try {
        const existingClient = await this.clientsService
          .findByDomain(clientData.domain)
          .catch(() => null);

        if (existingClient && !options.force) {
          if (options.verbose) {
            this.logger.log(`Customer "${clientData.name}" already exists!`);
          }
          continue;
        }

        if (existingClient && options.force) {
          await this.clientsService.update(existingClient.id, clientData);
          if (options.verbose) {
            this.logger.log(`Customer "${clientData.name}" update!`);
          }
        } else {
          const client = await this.clientsService.create(clientData);
          if (options.verbose) {
            this.logger.log(`Customer "${client.name}" created success!`);
          }
        }
      } catch (error) {
        this.logger.error(
          `❌ Erro ao processar cliente "${clientData.name}":`,
          error,
        );
      }
    }
  }

  private async initializeSuppliers(options: InitializationOptions) {
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

    for (const supplierData of suppliers) {
      try {
        const existingSuppliers = await this.suppliersService.findAll();
        const existingSupplier = existingSuppliers.find(
          (s) => s.name === supplierData.name,
        );

        if (existingSupplier && !options.force) {
          if (options.verbose) {
            this.logger.log(`Supplier "${supplierData.name}" already exists!`);
          }
          continue;
        }

        if (existingSupplier && options.force) {
          await this.suppliersService.update(existingSupplier.id, supplierData);
          if (options.verbose) {
            this.logger.log(`Supplier "${supplierData.name}" update!`);
          }
        } else {
          const supplier = await this.suppliersService.create(supplierData);
          if (options.verbose) {
            this.logger.log(
              `Supplier "${supplier.name}" successfully created!`,
            );
          }
        }
      } catch (error) {
        this.logger.error(
          `❌ Erro ao processar fornecedor "${supplierData.name}":`,
          error,
        );
      }
    }
  }

  private async initializeAdmin(options: InitializationOptions) {
    try {
      const existingAdmin = await this.usersService
        .findByEmail('admin@example.com')
        .catch(() => null);

      if (existingAdmin && !options.force) {
        if (options.verbose) {
          this.logger.log(' Administrator user already exists!');
        }
        return;
      }

      let defaultClient;
      try {
        defaultClient =
          await this.clientsService.findByDomain('localhost:3000');
      } catch {
        defaultClient = await this.clientsService.create({
          name: 'Localhost Client',
          domain: 'localhost:3000',
          primaryColor: '#2ecc71',
          secondaryColor: '#27ae60',
        });
        if (options.verbose) {
          this.logger.log('Default client successfully created!');
        }
      }

      if (existingAdmin && options.force) {
        await this.usersService.update(existingAdmin.id, {
          name: 'Administrador',
          password: 'admin123',
          role: 'admin',
          clientId: defaultClient.id,
        });
        if (options.verbose) {
          this.logger.log('Admin user updated!');
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
      }
    } catch (error) {
      this.logger.error('❌ Erro ao criar usuário administrador:', error);
    }
  }
}
