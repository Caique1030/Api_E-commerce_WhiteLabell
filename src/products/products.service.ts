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
    const whitelabelId = client?.id;   // o id do domínio
    const domain = client?.domain;

    // Notificar sobre a criação do produto
    const productEvent: ProductEvent = {
      id: savedProduct.id,
      name: savedProduct.name,
      price: savedProduct.price,
      clientId: whitelabelId,
    };

    this.eventsGateway.notifyProductCreated(productEvent , whitelabelId);

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
    const whitelabelId = client?.id;   // o id do domínio
    const domain = client?.domain;
    // Notificar sobre a atualização do produto
    const productEvent: ProductEvent = {
      id: updatedProduct.id,
      name: updatedProduct.name,
      price: updatedProduct.price,
      clientId: whitelabelId,
    };

    this.eventsGateway.notifyProductUpdated(productEvent , whitelabelId);

    return updatedProduct;
  }

  async remove(id: string): Promise<void> {
    const product = await this.findOne(id);
    const client = this.request['client'];
    const whitelabelId = client?.id;   // o id do domínio
    // Extrair clientId de forma segura
    const clientId = whitelabelId;

    await this.productRepository.remove(product);

    // Notificar sobre a remoção do produto
    this.eventsGateway.notifyProductRemoved(id, clientId , whitelabelId);
  }



  async syncProductsFromSuppliers(): Promise<void> {
    const suppliers = await this.suppliersService.findAll();

    for (const supplier of suppliers) {
      if (!supplier.isActive) continue;

      try {
        const products = await this.suppliersService.fetchProductsFromSupplier(
          supplier.id,
        );

        for (const externalProduct of products) {
          // Verificar se externalProduct tem uma propriedade id de forma segura
          if (!externalProduct || typeof externalProduct !== 'object') {
            continue; // Pular itens inválidos
          }

          // Safely check for id property
          const externalProductId = this.getExternalProductId(externalProduct);
          if (!externalProductId) {
            continue; // Skip products without ID
          }

          // Procurar se o produto já existe no banco de dados
          const existingProduct = await this.productRepository.findOne({
            where: {
              externalId: externalProductId,
              supplierId: supplier.id,
            },
          });

          // Mapear dados com base no tipo de fornecedor
          let productData: Partial<Product>;

          if (supplier.type === 'brazilian') {
            // Fornecedor brasileiro
            const brazilianProduct =
              externalProduct as ExternalProductBrazilian;
            productData = {
              name: brazilianProduct.nome || brazilianProduct.name || '',
              description: brazilianProduct.descricao,
              price:
                typeof brazilianProduct.preco === 'string'
                  ? parseFloat(brazilianProduct.preco)
                  : typeof brazilianProduct.preco === 'number'
                    ? brazilianProduct.preco
                    : 0,
              image: brazilianProduct.imagem,
              category: brazilianProduct.categoria,
              material: brazilianProduct.material,
              department: brazilianProduct.departamento,
              externalId: externalProductId,
              supplierId: supplier.id,
            };
          } else {
            // Fornecedor europeu
            const europeanProduct = externalProduct as ExternalProductEuropean;
            productData = {
              name: europeanProduct.name || '',
              description: europeanProduct.description,
              price:
                typeof europeanProduct.price === 'string'
                  ? parseFloat(europeanProduct.price)
                  : typeof europeanProduct.price === 'number'
                    ? europeanProduct.price
                    : 0,
              image:
                europeanProduct.gallery && europeanProduct.gallery.length > 0
                  ? europeanProduct.gallery[0]
                  : undefined,
              gallery: europeanProduct.gallery,
              hasDiscount: europeanProduct.hasDiscount,
              discountValue: europeanProduct.discountValue,
              externalId: externalProductId,
              supplierId: supplier.id,
            };
          }

          if (existingProduct) {
            // Atualizar produto existente
            Object.assign(existingProduct, productData);
            const updatedProduct =
              await this.productRepository.save(existingProduct);
              const client = this.request['client'];
              const whitelabelId = client?.id;
            // Notificar sobre a atualização do produto
            const productEvent: ProductEvent = {
              id: updatedProduct.id,
              name: updatedProduct.name,
              price: updatedProduct.price,
              clientId: whitelabelId,
            };

            this.eventsGateway.notifyProductUpdated(productEvent , whitelabelId);
          } else {
            // Criar novo produto
            const newProduct = this.productRepository.create(productData);
            const savedProduct = await this.productRepository.save(newProduct);
            const client = this.request['client'];
            const whitelabelId = client?.id;
            // Notificar sobre a criação do produto
            const productEvent: ProductEvent = {
              id: savedProduct.id,
              name: savedProduct.name,
              price: savedProduct.price,
              clientId: whitelabelId,
            };

            this.eventsGateway.notifyProductCreated(productEvent , whitelabelId);
          }
        }
      } catch (error) {
        console.error(
          `Error syncing products from supplier ${supplier.name}:`,
          error,
        );
      }
    }
  }

  // Helper method to safely extract id from external product
  private getExternalProductId(externalProduct: unknown): string | undefined {
    if (!externalProduct || typeof externalProduct !== 'object') {
      return undefined;
    }

    const product = externalProduct as Record<string, unknown>;
    const id = product.id;

    if (id === undefined || id === null) {
      return undefined;
    }

    // Ensure we can safely convert to string
    if (typeof id === 'string' || typeof id === 'number') {
      return String(id);
    }

    return undefined;
  }
}
