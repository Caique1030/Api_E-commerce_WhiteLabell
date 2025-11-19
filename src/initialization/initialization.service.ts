import { DataSource } from 'typeorm';
import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';

@Injectable()
export class InitializationService implements OnApplicationBootstrap {
  private readonly logger = new Logger(InitializationService.name);

  constructor(private dataSource: DataSource) {}

  async onApplicationBootstrap() {
    // Aguarda o TypeORM terminar de criar o schema
    await new Promise(res => setTimeout(res, 1000));

    this.logger.log("🌱 Iniciando verificação de dados...");

    await this.seedClients();
    await this.seedSuppliers();

    this.logger.log("✅ Dados iniciais verificados e inseridos quando necessário!");
  }

  // ------------------------------------------
  // CLIENTES
  // ------------------------------------------
  private async seedClients() {
    const clients = [
      {
        name: 'Devnology',
        domain: 'devnology.com',
        primary_color: '#2ecc71',
        secondary_color: '#27ae60',
      },
      {
        name: 'IN8',
        domain: 'in8.com',
        primary_color: '#8e44ad',
        secondary_color: '#9b59b6',
      },
      {
        name: 'Localhost Client',
        domain: 'localhost',
        primary_color: '#2ecc71',
        secondary_color: '#27ae60',
      },
    ];

    for (const client of clients) {
      const exists = await this.dataSource.query(
        `SELECT 1 FROM clients WHERE domain = $1 LIMIT 1`,
        [client.domain],
      );

      if (exists.length > 0) {
        this.logger.log(`✔ Cliente já existe: ${client.name}`);
        continue;
      }

      await this.dataSource.query(
        `
        INSERT INTO clients (name, domain, primary_color, secondary_color)
        VALUES ($1, $2, $3, $4)
        `,
        [
          client.name,
          client.domain,
          client.primary_color,
          client.secondary_color,
        ],
      );

      this.logger.log(`➕ Cliente criado: ${client.name}`);
    }
  }

  // ------------------------------------------
  // FORNECEDORES
  // ------------------------------------------
  private async seedSuppliers() {
    const suppliers = [
      {
        name: 'Fornecedor Brasileiro',
        type: 'brazilian',
        api_url:
          'http://616d6bdb6dacbb001794ca17.mockapi.io/devnology/brazilian_provider',
      },
      {
        name: 'Fornecedor Europeu',
        type: 'european',
        api_url:
          'http://616d6bdb6dacbb001794ca17.mockapi.io/devnology/european_provider',
      },
    ];

    for (const supplier of suppliers) {
      const exists = await this.dataSource.query(
        `SELECT 1 FROM suppliers WHERE name = $1 LIMIT 1`,
        [supplier.name],
      );

      if (exists.length > 0) {
        this.logger.log(`✔ Fornecedor já existe: ${supplier.name}`);
        continue;
      }

      await this.dataSource.query(
        `
        INSERT INTO suppliers (name, type, api_url)
        VALUES ($1, $2, $3)
        `,
        [supplier.name, supplier.type, supplier.api_url],
      );

      this.logger.log(`➕ Fornecedor criado: ${supplier.name}`);
    }
  }
}
