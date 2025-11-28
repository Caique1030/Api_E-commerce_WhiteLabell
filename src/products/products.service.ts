import {
  Inject,
  Injectable,
  NotFoundException,
  Scope,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindManyOptions } from 'typeorm';
import { Product } from './entities/product.entity';
import { SuppliersService } from '../suppliers/suppliers.service';
import { FilterProductsDto } from './dto/filter-products.dto';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import { Supplier } from 'src/suppliers/entities/supplier.entity';
import axios from 'axios';

@Injectable({ scope: Scope.REQUEST })
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @Inject(REQUEST)
    private readonly request: Request,

    private readonly suppliersService: SuppliersService,
  ) {}


  async findAll(
    filters?: FilterProductsDto,
  ): Promise<{ products: Product[]; total: number }> {
    const where: Record<string, unknown> = {};
    const options: FindManyOptions<Product> = {
      take: filters?.limit === -1 ? undefined : filters?.limit || 150,
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


  async syncProductsFromSuppliers() {
    this.logger.log('🔄 Iniciando sincronização de produtos...');
    const suppliers = await this.suppliersService.findAll();

    let totalSynced = 0;
    const results: Array<{
      supplier: string;
      type?: string;
      synced: number;
      errors?: number;
      total?: number;
      error?: string;
      status: 'success' | 'error';
    }> = [];

    for (const supplier of suppliers) {
      try {
       

        const products = await this.fetchAllSupplierProducts(supplier);

        

        let syncedCount = 0;
        let errorCount = 0;

        for (const product of products) {
          try {
            await this.createOrUpdateExternalProduct(product, supplier.id);
            syncedCount++;
          } catch (error) {
            errorCount++;
            this.logger.error(
              `❌ Erro ao salvar produto ${product.id}:`,
              error.message,
            );
          }
        }

        totalSynced += syncedCount;
        results.push({
          supplier: supplier.name,
          type: supplier.type,
          synced: syncedCount,
          errors: errorCount,
          total: products.length,
          status: 'success',
        });

        
      } catch (error) {
        this.logger.error(
          `❌ Erro ao sincronizar ${supplier.name}:`,
          error.message,
        );
        results.push({
          supplier: supplier.name,
          synced: 0,
          error: error.message,
          status: 'error',
        });
      }
    }

    

    return {
      message: 'Products synchronized successfully',
      totalSynced,
      details: results,
    };
  }

  
  private async fetchAllSupplierProducts(supplier: Supplier): Promise<any[]> {
    try {
      const response = await axios.get(supplier.apiUrl, {
        timeout: 15000,
        validateStatus: (status) => status < 500,
      });

      if (!response.data || !Array.isArray(response.data)) {
        
        return [];
      }

      return this.normalizeProducts(response.data, supplier.type);
    } catch (error) {
      this.logger.error(
        `❌ Error fetching products from ${supplier.name}:`,
        error.message,
      );
      return [];
    }
  }


  private normalizeProducts(products: any[], supplierType: string): any[] {
    if (!Array.isArray(products)) {
      return [];
    }

    const flattenedProducts = this.flattenProductArray(products);

    

    return flattenedProducts
      .filter((product) => this.isValidProduct(product, supplierType))
      .map((product) => this.normalizeProduct(product, supplierType));
  }

  private flattenProductArray(products: any[]): any[] {
    const result: any[] = [];
    const seenIds = new Set<string>();

    const processItem = (item: any, depth: number = 0) => {
      if (depth > 5) return;

      if (!item || typeof item !== 'object') return;

      if (Array.isArray(item)) {
        for (const subItem of item) {
          processItem(subItem, depth + 1);
        }
        return;
      }

      if (item.id && (item.nome || item.name)) {
        const id = String(item.id);

        if (!seenIds.has(id)) {
          seenIds.add(id);

          const cleanItem = this.cleanProductObject(item);
          result.push(cleanItem);
        }
      }

      const keys = Object.keys(item);
      for (const key of keys) {
        if (
          key === 'id' ||
          key === 'nome' ||
          key === 'name' ||
          key === 'preco' ||
          key === 'price' ||
          key === 'descricao' ||
          key === 'description' ||
          key === 'categoria' ||
          key === 'category' ||
          key === 'material' ||
          key === 'departamento' ||
          key === 'imagem' ||
          key === 'image' ||
          key === 'gallery' ||
          key === 'hasDiscount' ||
          key === 'discountValue' ||
          key === 'details'
        ) {
          continue;
        }

        if (
          (!isNaN(Number(key)) || key === 'body' || key === 'data') &&
          item[key] &&
          typeof item[key] === 'object'
        ) {
          processItem(item[key], depth + 1);
        }
      }
    };

    for (const item of products) {
      processItem(item, 0);
    }

    return result;
  }


  private cleanProductObject(product: any): any {
    const cleaned: any = {};

    for (const [key, value] of Object.entries(product)) {
      if (!isNaN(Number(key))) {
        continue;
      }

      if (
        key === 'body' ||
        key === 'email' ||
        key === 'password' ||
        key === 'username' ||
        key === 'userId'
      ) {
        continue;
      }

      if (
        value === null ||
        value === undefined ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        Array.isArray(value) ||
        (typeof value === 'object' && Object.keys(value).length < 10)
      ) {
        cleaned[key] = value;
      }
    }

    return cleaned;
  }


  private isValidProduct(product: any, supplierType: string): boolean {
    if (!product || typeof product !== 'object') {
      return false;
    }

    if (typeof product.nome === 'object' || typeof product.name === 'object') {
      return false;
    }

    if (product.body || product.email || product.password) {
      return false;
    }

    if (supplierType === 'brazilian') {
      return !!(product.id && product.nome && product.preco);
    } else {
      return !!(product.id && product.name && product.price);
    }
  }


  private normalizeProduct(product: any, supplierType: string): any {
    if (supplierType === 'brazilian') {
      return {
        id: String(product.id),
        name: product.nome || product.name || 'Produto sem nome',
        description: product.descricao || '',
        price: this.parsePrice(product.preco),
        image: product.imagem || '',
        gallery: Array.isArray(product.gallery) ? product.gallery : [],
        category: product.categoria || '',
        material: product.material || '',
        department: product.departamento || '',
        hasDiscount: false,
        discountValue: '0',
      };
    } else {
      return {
        id: String(product.id),
        name: product.name || 'Produto sem nome',
        description: product.description || '',
        price: this.parsePrice(product.price),
        image:
          Array.isArray(product.gallery) && product.gallery.length > 0
            ? product.gallery[0]
            : '',
        gallery: Array.isArray(product.gallery) ? product.gallery : [],
        category: product.details?.adjective || '',
        material: product.details?.material || '',
        department: '',
        hasDiscount: product.hasDiscount || false,
        discountValue: product.discountValue || '0',
      };
    }
  }


  private parsePrice(price: any): number {
    if (typeof price === 'number') {
      return price;
    }

    if (typeof price === 'string') {
      const cleaned = price.replace(/[^\d.,]/g, '');
      const normalized = cleaned.replace(',', '.');
      const parsed = parseFloat(normalized);
      return isNaN(parsed) ? 0 : parsed;
    }

    return 0;
  }

  private async createOrUpdateExternalProduct(data: any, supplierId: string) {
    const existing = await this.productRepository.findOne({
      where: { externalId: data.id, supplierId },
    });

    const productData = {
      name: data.name,
      description: data.description,
      price: data.price,
      image: data.image,
      gallery: data.gallery,
      category: data.category,
      material: data.material,
      department: data.department,
      hasDiscount: data.hasDiscount,
      discountValue: data.discountValue,
      externalId: data.id,
      supplierId: supplierId,
    };

    if (existing) {
      return await this.productRepository.save({
        ...existing,
        ...productData,
        updatedAt: new Date(),
      });
    } else {
      return await this.productRepository.save(productData);
    }
  }
}
