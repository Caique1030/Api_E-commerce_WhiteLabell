import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './entities/client.entity';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { EventsGateway } from 'src/events/events.gateway';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    // private readonly eventsGateway: EventsGateway, // Injetar EventsGateway
  ) {}

  async create(createClientDto: CreateClientDto): Promise<Client> {
    const existingNameClient = await this.clientRepository.findOne({
      where: { name: createClientDto.name },
    });

    if (existingNameClient) {
      throw new ConflictException(
        `name '${createClientDto.name}' is already in use`,
      );
    }

    const existingDomainClient = await this.clientRepository.findOne({
      where: { domain: createClientDto.domain },
    });

    if (existingDomainClient) {
      throw new ConflictException(
        `Domain '${createClientDto.domain}' is already in use`,
      );
    }

    const newClient = this.clientRepository.create(createClientDto);
    const savedClient = await this.clientRepository.save(newClient);

    // this.eventsGateway.notifyClientCreated(
    //   savedClient as unknown as ClientEvent,
    // );

    return savedClient;
  }

  async findAll(): Promise<Client[]> {
    return this.clientRepository.find();
  }

  async findOne(id: string): Promise<Client> {
    const client = await this.clientRepository.findOne({
      where: { id },
      relations: ['users'],
    });

    if (!client) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return client;
  }

  async findByDomain(domain: string): Promise<Client> {
    const client = await this.clientRepository.findOne({
      where: { domain, isActive: true },
    });

    if (!client) {
      throw new NotFoundException(
        `Customer with domain ${domain} not found`,
      );
    }

    return client;
  }

  async update(id: string, updateClientDto: UpdateClientDto): Promise<Client> {
    const client = await this.findOne(id);

    if (updateClientDto.name && updateClientDto.name !== client.name) {
      const existingNameClient = await this.clientRepository.findOne({
        where: { name: updateClientDto.name },
      });

      if (existingNameClient) {
        throw new ConflictException(
          `Name '${updateClientDto.name}' is already in use`,
        );
      }
    }

    if (updateClientDto.domain && updateClientDto.domain !== client.domain) {
      const existingDomainClient = await this.clientRepository.findOne({
        where: { domain: updateClientDto.domain },
      });

      if (existingDomainClient) {
        throw new ConflictException(
          `Domain '${updateClientDto.domain}' is already in `,
        );
      }
    }

    Object.assign(client, updateClientDto);
    const updatedClient = await this.clientRepository.save(client);

    // this.eventsGateway.notifyClientUpdated(
    //   updatedClient as unknown as ClientEvent,
    // );

    return updatedClient;
  }

  async remove(id: string): Promise<void> {
    const client = await this.findOne(id);
    await this.clientRepository.remove(client);

    // this.eventsGateway.notifyClientRemoved(id);
  }

  async createIfNotExists(data: Partial<Client>): Promise<Client> {
    const existing = await this.clientRepository.findOne({
      where: { domain: data.domain },
    });

    if (existing) return existing;

    const client = this.clientRepository.create(data);
    return this.clientRepository.save(client);
  }
}
