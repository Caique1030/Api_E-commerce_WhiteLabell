import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './entities/client.entity';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
  ) {}

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
      throw new NotFoundException(`Customer with domain ${domain} not found`);
    }

    return client;
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
