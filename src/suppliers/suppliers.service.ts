import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier } from './entities/supplier.entity';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { EventsGateway } from 'src/events/events.gateway';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
    private readonly httpService: HttpService,
    private readonly eventsGateway: EventsGateway, // Injetar EventsGateway
  ) {}

  async create(createSupplierDto: CreateSupplierDto): Promise<Supplier> {
    const { name } = createSupplierDto;

    // Verificar se já existe um fornecedor com esse nome
    const existingSupplier = await this.supplierRepository.findOne({
      where: { name },
    });

    if (existingSupplier) {
      throw new ConflictException('Nome já está em uso');
    }

    const newSupplier = this.supplierRepository.create(createSupplierDto);
    const savedSupplier = await this.supplierRepository.save(newSupplier);

    // Notificar sobre a criação do fornecedor
    this.eventsGateway.notifySupplierCreated(savedSupplier);

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
    updateSupplierDto: UpdateSupplierDto,
  ): Promise<Supplier> {
    const supplier = await this.findOne(id);
    Object.assign(supplier, updateSupplierDto);
    const updatedSupplier = await this.supplierRepository.save(supplier);

    // Notificar sobre a atualização do fornecedor
    this.eventsGateway.notifySupplierUpdated(updatedSupplier);

    return updatedSupplier;
  }

  async remove(id: string): Promise<void> {
    const supplier = await this.findOne(id);
    await this.supplierRepository.remove(supplier);

    // Notificar sobre a remoção do fornecedor
    this.eventsGateway.notifySupplierRemoved(id);
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
