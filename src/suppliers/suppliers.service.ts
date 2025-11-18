import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier } from './entities/supplier.entity';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { EventsGateway } from 'src/events/events.gateway';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import { CreateSupplierDto } from './dtos/create-supplier.dto';
import { UpdateDto } from './dtos/update.dto';

@Injectable()
export class SuppliersService {
 constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,

    private readonly httpService: HttpService,
    private readonly eventsGateway: EventsGateway,

    @Inject(REQUEST) private readonly request: Request, 
  ) {}

  async create(createSupplierDto: CreateSupplierDto): Promise<Supplier> {
    const { name } = createSupplierDto;
    const client = this.request['client'];

    const existingSupplier = await this.supplierRepository.findOne({
      where: { name },
    });

    if (existingSupplier) {
      throw new ConflictException('Nome já está em uso');
    }

    const newSupplier = this.supplierRepository.create(createSupplierDto);
    const savedSupplier = await this.supplierRepository.save(newSupplier);


    return savedSupplier;
  }

  async findAll(): Promise<Supplier[]> {
    return this.supplierRepository.find();
  }

  async findOne(id: string): Promise<Supplier> {
    const supplier = await this.supplierRepository.findOne({ where: { id } });
    if (!supplier) {
      throw new NotFoundException(`Fornecedor com ID ${id} não encontrado`);
    }
    return supplier;
  }

  async update(
    id: string,
    updateSupplierDto: UpdateDto,
  ): Promise<Supplier> {
    const supplier = await this.findOne(id);
    Object.assign(supplier, updateSupplierDto);
    const updatedSupplier = await this.supplierRepository.save(supplier);
    const client = this.request['client'];


    return updatedSupplier;
  }

  async remove(id: string): Promise<void> {
    const supplier = await this.findOne(id);
    await this.supplierRepository.remove(supplier);
    const client = this.request['client'];

  }

  async fetchProductsFromSupplier(supplierId: string): Promise<any[]> {
    const supplier = await this.findOne(supplierId);
    try {
      const response = await lastValueFrom(
        this.httpService.get(supplier.apiUrl),
      );
      return response.data as any[];
    } catch (error) {
      throw new Error(
        `Failed to fetch products from supplier: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async fetchProductByIdFromSupplier(
    supplierId: string,
    productId: string,
  ): Promise<any> {
    const supplier = await this.findOne(supplierId);
    try {
      const response = await lastValueFrom(
        this.httpService.get(`${supplier.apiUrl}/${productId}`),
      );
      return response.data;
    } catch (error) {
      throw new Error(
        `Failed to fetch product from supplier: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
