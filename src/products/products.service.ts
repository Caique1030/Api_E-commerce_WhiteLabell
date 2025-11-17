import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindManyOptions } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SuppliersService } from '../suppliers/suppliers.service';
import { FilterProductsDto } from './dto/filter-products.dto';
import {
  ProductEvent,
  ExternalProductBrazilian,
  ExternalProductEuropean,
} from '../interfaces';
import { EventsGateway } from 'src/events/events.gateway';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import { Supplier } from 'src/suppliers/entities/supplier.entity';
import axios from 'axios';

@Injectable({ scope: Scope.REQUEST })
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @Inject(REQUEST)
    private readonly request: Request,

    private readonly suppliersService: SuppliersService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const newProduct = this.productRepository.create(createProductDto);
    const savedProduct = await this.productRepository.save(newProduct);
    const client = this.request['client'];
    const whitelabelId = client?.id;
    const domain = client?.domain;

    const productEvent: ProductEvent = {
      id: savedProduct.id,
      name: savedProduct.name,
      price: savedProduct.price,
      clientId: whitelabelId,
    };

    this.eventsGateway.notifyProductCreated(productEvent, whitelabelId);

    return savedProduct;
  }

  async findAll(
    filters?: FilterProductsDto,
  ): Promise<{ products: Product[]; total: number }> {
    const where: Record<string, unknown> = {};
    const options: FindManyOptions<Product> = {
      take: filters?.limit || 10,
      skip: filters?.offset || 0,
      order: { createdAt: 'DESC' },
    };

    if (filters?.name) {
      where.name = Like(`%${filters.name}%`);
    }

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.minPrice || filters?.maxPrice) {
      const priceFilter: Record<string, number> = {};

      if (filters?.minPrice) {
        priceFilter.gte = filters.minPrice;
      }

      if (filters?.maxPrice) {
        priceFilter.lte = filters.maxPrice;
      }

      where.price = priceFilter;
    }

    if (filters?.supplierId) {
      where.supplierId = filters.supplierId;
    }

    if (Object.keys(where).length > 0) {
      options.where = where;
    }

    const [products, total] =
      await this.productRepository.findAndCount(options);
    return { products, total };
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['supplier'],
    });

    if (!product) {
      throw new NotFoundException(`Produto com ID ${id} não encontrado`);
    }

    return product;
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    const product = await this.findOne(id);
    Object.assign(product, updateProductDto);
    const updatedProduct = await this.productRepository.save(product);
    const client = this.request['client'];
    const whitelabelId = client?.id;
    const domain = client?.domain;

    const productEvent: ProductEvent = {
      id: updatedProduct.id,
      name: updatedProduct.name,
      price: updatedProduct.price,
      clientId: whitelabelId,
    };

    this.eventsGateway.notifyProductUpdated(productEvent, whitelabelId);

    return updatedProduct;
  }

  async remove(id: string): Promise<void> {
    const product = await this.findOne(id);
    const client = this.request['client'];
    const whitelabelId = client?.id;
    const clientId = whitelabelId;

    await this.productRepository.remove(product);

    this.eventsGateway.notifyProductRemoved(id, clientId, whitelabelId);
  }

 async syncProductsFromSuppliers() {
  const suppliers = await this.suppliersService.findAll();

  for (const supplier of suppliers) {
    const products = await this.fetchAllSupplierProducts(supplier);

    for (const p of products) {
      await this.createOrUpdateExternalProduct(p, supplier.id);
    }
  }

  return { message: 'Products synchronized successfully' };
}

private async createOrUpdateExternalProduct(data: any, supplierId: string) {
  const existing = await this.productRepository.findOne({
    where: { externalId: data.id, supplierId },
  });

  if (existing) {
    return await this.productRepository.save({
      ...existing,
      name: data.name,
      description: data.description,
      price: data.price,
      image: data.image,
      gallery: data.gallery,
      hasDiscount: data.hasDiscount,
      discountValue: data.discountValue,
      updatedAt: new Date(),
    });
  }

  return await this.productRepository.save({
    name: data.name,
    description: data.description,
    price: data.price,
    image: data.image,
    gallery: data.gallery,
    externalId: data.id,
    supplierId,
  });
}



  private getExternalProductId(externalProduct: unknown): string | undefined {
    if (!externalProduct || typeof externalProduct !== 'object') {
      return undefined;
    }

    const product = externalProduct as Record<string, unknown>;
    const id = product.id;

    if (id === undefined || id === null) {
      return undefined;
    }

    if (typeof id === 'string' || typeof id === 'number') {
      return String(id);
    }

    return undefined;
  }

private async fetchAllSupplierProducts(
  supplier: Supplier
): Promise<(ExternalProductBrazilian | ExternalProductEuropean)[]> {
  const MAX_PAGES = 20; // segurança para evitar loops infinitos
  let page = 1;
  const limit = 50;

  let allProducts: (ExternalProductBrazilian | ExternalProductEuropean)[] = [];

  while (page <= MAX_PAGES) {
    const url = `${supplier.apiUrl}?page=${page}&limit=${limit}`;

    const response = await axios.get(url, { timeout: 8000 });
    const products = response.data;

    // Se a API não tem paginação, e retorna sempre o mesmo array
    if (!Array.isArray(products)) break;

    allProducts.push(...products);

    // API realmente tem paginação → parar quando acabar
    if (products.length < limit) break;

    // API NÃO tem paginação → parar para evitar loop
    if (products.length === allProducts.length && page > 1) break;

    page++;
  }

  return allProducts;
}



}
