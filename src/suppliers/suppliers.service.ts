import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier } from './entities/supplier.entity';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
    private readonly httpService: HttpService,
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
    return this.supplierRepository.save(newSupplier);
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

  async update(id: string, updateSupplierDto: UpdateSupplierDto): Promise<Supplier> {
    const supplier = await this.findOne(id);
    Object.assign(supplier, updateSupplierDto);
    return this.supplierRepository.save(supplier);
  }

  async remove(id: string): Promise<void> {
    const supplier = await this.findOne(id);
    await this.supplierRepository.remove(supplier);
  }

  async fetchProductsFromSupplier(supplierId: string): Promise<any[]> {
    const supplier = await this.findOne(supplierId);
    try {
      const response = await lastValueFrom(
        this.httpService.get(supplier.apiUrl),
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch products from supplier: ${error.message}`);
    }
  }

  async fetchProductByIdFromSupplier(supplierId: string, productId: string): Promise<any> {
    const supplier = await this.findOne(supplierId);
    try {
      const response = await lastValueFrom(
        this.httpService.get(`${supplier.apiUrl}/${productId}`),
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch product from supplier: ${error.message}`);
    }
  }
}
