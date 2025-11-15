import {
  Inject,
  Injectable,
  NotFoundException,
  Scope,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  Like,
  FindManyOptions,
  Between,
  MoreThanOrEqual,
  LessThanOrEqual,
} from 'typeorm';
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
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @Inject(REQUEST)
    private readonly request: Request,

    private readonly suppliersService: SuppliersService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  /**
   * Cria um novo produto
   */
  async create(createProductDto: CreateProductDto): Promise<Product> {
    try {
      const newProduct = this.productRepository.create(createProductDto);
      const savedProduct = await this.productRepository.save(newProduct);
      const client = this.request['client'];
      const whitelabelId = client?.id;

      const productEvent: ProductEvent = {
        id: savedProduct.id,
        name: savedProduct.name,
        price: savedProduct.price,
        clientId: whitelabelId,
      };

      this.eventsGateway.notifyProductCreated(productEvent, whitelabelId);
      this.logger.log(
        `Produto criado: ${savedProduct.id} - ${savedProduct.name}`,
      );

      return savedProduct;
    } catch (error) {
      this.logger.error(`Erro ao criar produto: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Lista produtos com filtros opcionais
   */
  async findAll(
    filters?: FilterProductsDto,
  ): Promise<{ products: Product[]; total: number }> {
    try {
      const where: any = {};
      const options: FindManyOptions<Product> = {
        take: filters?.limit || 10,
        skip: filters?.offset || 0,
        order: { createdAt: 'DESC' },
        relations: ['supplier'],
      };

      // Filtro por nome (busca parcial)
      if (filters?.name) {
        where.name = Like(`%${filters.name}%`);
      }

      // Filtro por categoria
      if (filters?.category) {
        where.category = filters.category;
      }

      // Filtro por faixa de preço
      if (filters?.minPrice !== undefined && filters?.maxPrice !== undefined) {
        where.price = Between(filters.minPrice, filters.maxPrice);
      } else if (filters?.minPrice !== undefined) {
        where.price = MoreThanOrEqual(filters.minPrice);
      } else if (filters?.maxPrice !== undefined) {
        where.price = LessThanOrEqual(filters.maxPrice);
      }

      // Filtro por fornecedor
      if (filters?.supplierId) {
        where.supplierId = filters.supplierId;
      }

      if (Object.keys(where).length > 0) {
        options.where = where;
      }

      const [products, total] =
        await this.productRepository.findAndCount(options);

      this.logger.debug(
        `Produtos encontrados: ${products.length} de ${total} total`,
      );

      return { products, total };
    } catch (error) {
      this.logger.error(
        `Erro ao listar produtos: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Busca um produto por ID
   */
  async findOne(id: string): Promise<Product> {
    try {
      const product = await this.productRepository.findOne({
        where: { id },
        relations: ['supplier'],
      });

      if (!product) {
        throw new NotFoundException(`Produto com ID ${id} não encontrado`);
      }

      return product;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Erro ao buscar produto ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Atualiza um produto existente
   */
  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    try {
      const product = await this.findOne(id);
      Object.assign(product, updateProductDto);
      const updatedProduct = await this.productRepository.save(product);

      const client = this.request['client'];
      const whitelabelId = client?.id;

      const productEvent: ProductEvent = {
        id: updatedProduct.id,
        name: updatedProduct.name,
        price: updatedProduct.price,
        clientId: whitelabelId,
      };

      this.eventsGateway.notifyProductUpdated(productEvent, whitelabelId);
      this.logger.log(
        `Produto atualizado: ${updatedProduct.id} - ${updatedProduct.name}`,
      );

      return updatedProduct;
    } catch (error) {
      this.logger.error(
        `Erro ao atualizar produto ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Remove um produto
   */
  async remove(id: string): Promise<void> {
    try {
      const product = await this.findOne(id);
      const client = this.request['client'];
      const whitelabelId = client?.id;

      await this.productRepository.remove(product);

      this.eventsGateway.notifyProductRemoved(id, whitelabelId, whitelabelId);
      this.logger.log(`Produto removido: ${id}`);
    } catch (error) {
      this.logger.error(
        `Erro ao remover produto ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Sincroniza produtos de todos os fornecedores ativos
   */
  async syncProductsFromSuppliers(): Promise<{
    success: boolean;
    message: string;
    stats: {
      totalSuppliers: number;
      successfulSuppliers: number;
      failedSuppliers: number;
      productsCreated: number;
      productsUpdated: number;
      productsSkipped: number;
    };
  }> {
    this.logger.log('Iniciando sincronização de produtos dos fornecedores...');

    const stats = {
      totalSuppliers: 0,
      successfulSuppliers: 0,
      failedSuppliers: 0,
      productsCreated: 0,
      productsUpdated: 0,
      productsSkipped: 0,
    };

    try {
      const suppliers = await this.suppliersService.findAll();
      stats.totalSuppliers = suppliers.length;

      for (const supplier of suppliers) {
        if (!supplier.isActive) {
          this.logger.warn(`Fornecedor inativo ignorado: ${supplier.name}`);
          stats.productsSkipped++;
          continue;
        }

        try {
          this.logger.log(
            `Sincronizando produtos do fornecedor: ${supplier.name}`,
          );

          const products =
            await this.suppliersService.fetchProductsFromSupplier(supplier.id);

          if (!Array.isArray(products) || products.length === 0) {
            this.logger.warn(
              `Nenhum produto retornado do fornecedor: ${supplier.name}`,
            );
            continue;
          }

          for (const externalProduct of products) {
            try {
              await this.syncSingleProduct(externalProduct, supplier, stats);
            } catch (productError) {
              this.logger.error(
                `Erro ao sincronizar produto individual do fornecedor ${supplier.name}:`,
                productError.message,
              );
              stats.productsSkipped++;
            }
          }

          stats.successfulSuppliers++;
          this.logger.log(
            `Fornecedor ${supplier.name} sincronizado com sucesso`,
          );
        } catch (error) {
          stats.failedSuppliers++;
          this.logger.error(
            `Erro ao sincronizar fornecedor ${supplier.name}:`,
            error.message,
          );
        }
      }

      const message = `Sincronização concluída: ${stats.productsCreated} criados, ${stats.productsUpdated} atualizados, ${stats.productsSkipped} ignorados`;
      this.logger.log(message);

      return {
        success: true,
        message,
        stats,
      };
    } catch (error) {
      this.logger.error(
        'Erro crítico na sincronização:',
        error.message,
        error.stack,
      );
      throw new BadRequestException(
        'Erro ao sincronizar produtos dos fornecedores',
      );
    }
  }

  /**
   * Sincroniza um único produto
   */
  private async syncSingleProduct(
    externalProduct: unknown,
    supplier: any,
    stats: any,
  ): Promise<void> {
    if (!externalProduct || typeof externalProduct !== 'object') {
      stats.productsSkipped++;
      return;
    }

    const externalProductId = this.getExternalProductId(externalProduct);
    if (!externalProductId) {
      this.logger.warn('Produto sem ID externo foi ignorado');
      stats.productsSkipped++;
      return;
    }

    const existingProduct = await this.productRepository.findOne({
      where: {
        externalId: externalProductId,
        supplierId: supplier.id,
      },
    });

    const productData = this.mapExternalProductToInternal(
      externalProduct,
      supplier,
      externalProductId,
    );

    if (!productData.name) {
      this.logger.warn(
        `Produto sem nome foi ignorado: ID ${externalProductId}`,
      );
      stats.productsSkipped++;
      return;
    }

    const client = this.request['client'];
    const whitelabelId = client?.id;

    if (existingProduct) {
      Object.assign(existingProduct, productData);
      const updatedProduct = await this.productRepository.save(existingProduct);

      const productEvent: ProductEvent = {
        id: updatedProduct.id,
        name: updatedProduct.name,
        price: updatedProduct.price,
        clientId: whitelabelId,
      };

      this.eventsGateway.notifyProductUpdated(productEvent, whitelabelId);
      stats.productsUpdated++;
      this.logger.debug(`Produto atualizado: ${updatedProduct.name}`);
    } else {
      const newProduct = this.productRepository.create(productData);
      const savedProduct = await this.productRepository.save(newProduct);

      const productEvent: ProductEvent = {
        id: savedProduct.id,
        name: savedProduct.name,
        price: savedProduct.price,
        clientId: whitelabelId,
      };

      this.eventsGateway.notifyProductCreated(productEvent, whitelabelId);
      stats.productsCreated++;
      this.logger.debug(`Produto criado: ${savedProduct.name}`);
    }
  }

  /**
   * Mapeia produto externo para estrutura interna
   */
  private mapExternalProductToInternal(
    externalProduct: unknown,
    supplier: any,
    externalProductId: string,
  ): Partial<Product> {
    if (supplier.type === 'brazilian') {
      const brazilianProduct = externalProduct as ExternalProductBrazilian;
      return {
        name: brazilianProduct.nome || brazilianProduct.name || '',
        description: brazilianProduct.descricao,
        price: this.parsePrice(brazilianProduct.preco),
        image: brazilianProduct.imagem,
        category: brazilianProduct.categoria,
        material: brazilianProduct.material,
        department: brazilianProduct.departamento,
        externalId: externalProductId,
        supplierId: supplier.id,
      };
    } else {
      const europeanProduct = externalProduct as ExternalProductEuropean;
      return {
        name: europeanProduct.name || '',
        description: europeanProduct.description,
        price: this.parsePrice(europeanProduct.price),
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
  }

  /**
   * Converte preço para número
   */
  private parsePrice(price: unknown): number {
    if (typeof price === 'string') {
      const parsed = parseFloat(price);
      return isNaN(parsed) ? 0 : parsed;
    }
    if (typeof price === 'number') {
      return price;
    }
    return 0;
  }

  /**
   * Extrai ID do produto externo
   */
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
}
