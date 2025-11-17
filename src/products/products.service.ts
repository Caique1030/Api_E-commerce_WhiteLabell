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
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SuppliersService } from '../suppliers/suppliers.service';
import { FilterProductsDto } from './dto/filter-products.dto';
import { ProductEvent } from '../interfaces';
import { EventsGateway } from 'src/events/events.gateway';
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
    private readonly eventsGateway: EventsGateway,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
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

    return savedProduct;
  }

  async findAll(
    filters?: FilterProductsDto,
  ): Promise<{ products: Product[]; total: number }> {
    const where: Record<string, unknown> = {};
    const options: FindManyOptions<Product> = {
      // ✅ Se limit for -1, busca todos
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

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
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

  /**
   * Sincroniza produtos de todos os fornecedores
   * Normaliza os dados de acordo com o tipo de fornecedor (brazilian/european)
   */
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
        this.logger.log(
          `📦 Sincronizando fornecedor: ${supplier.name} (${supplier.type})`,
        );

        const products = await this.fetchAllSupplierProducts(supplier);

        this.logger.log(
          `📊 ${products.length} produtos encontrados e validados`,
        );

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

        this.logger.log(
          `✅ ${supplier.name}: ${syncedCount} produtos sincronizados (${errorCount} erros)`,
        );
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

    this.logger.log(
      `✅ Sincronização concluída: ${totalSynced} produtos totais`,
    );

    return {
      message: 'Products synchronized successfully',
      totalSynced,
      details: results,
    };
  }

  /**
   * Busca todos os produtos de um fornecedor
   * Lida com diferentes formatos de resposta da API
   */
  private async fetchAllSupplierProducts(supplier: Supplier): Promise<any[]> {
    try {
      const response = await axios.get(supplier.apiUrl, {
        timeout: 15000,
        validateStatus: (status) => status < 500,
      });

      if (!response.data || !Array.isArray(response.data)) {
        this.logger.warn(
          `⚠️ Supplier ${supplier.name} returned invalid data format`,
        );
        return [];
      }

      // Normalizar produtos baseado no tipo de fornecedor
      return this.normalizeProducts(response.data, supplier.type);
    } catch (error) {
      this.logger.error(
        `❌ Error fetching products from ${supplier.name}:`,
        error.message,
      );
      return [];
    }
  }

  /**
   * Normaliza a estrutura dos produtos de acordo com o fornecedor
   * Lida com estruturas aninhadas e malformadas
   */
  private normalizeProducts(products: any[], supplierType: string): any[] {
    if (!Array.isArray(products)) {
      this.logger.warn('⚠️ Products data is not an array');
      return [];
    }

    // Flatten nested objects and extract valid products
    const flattenedProducts = this.flattenProductArray(products);

    this.logger.debug(
      `🔍 Produtos após flatten: ${flattenedProducts.length} de ${products.length} originais`,
    );

    return flattenedProducts
      .filter((product) => this.isValidProduct(product, supplierType))
      .map((product) => this.normalizeProduct(product, supplierType));
  }

  /**
   * Achata array de produtos que podem conter objetos aninhados malformados
   * Lida com estruturas como:
   * - { "0": {...}, "1": {...}, "nome": "...", "id": "52" }
   * - { "nome": "...", "body": {...} }
   * - Arrays normais
   */
  private flattenProductArray(products: any[]): any[] {
    const result: any[] = [];
    const seenIds = new Set<string>();

    const processItem = (item: any, depth: number = 0) => {
      // Prevenir recursão infinita
      if (depth > 5) return;

      if (!item || typeof item !== 'object') return;

      // Se for um array, processar cada item
      if (Array.isArray(item)) {
        for (const subItem of item) {
          processItem(subItem, depth + 1);
        }
        return;
      }

      // Verificar se tem um ID válido no nível atual
      if (item.id && (item.nome || item.name)) {
        const id = String(item.id);

        // Evitar duplicatas
        if (!seenIds.has(id)) {
          seenIds.add(id);

          // Remover propriedades que são objetos aninhados malformados
          const cleanItem = this.cleanProductObject(item);
          result.push(cleanItem);
        }
      }

      // Processar chaves que podem conter produtos aninhados
      const keys = Object.keys(item);
      for (const key of keys) {
        // Ignorar chaves que são propriedades do produto válido
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

        // Processar chaves numéricas ou objetos aninhados
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

  /**
   * Remove propriedades inválidas ou malformadas do objeto produto
   */
  private cleanProductObject(product: any): any {
    const cleaned: any = {};

    for (const [key, value] of Object.entries(product)) {
      // Pular chaves numéricas (objetos aninhados)
      if (!isNaN(Number(key))) {
        continue;
      }

      // Pular propriedades problemáticas
      if (
        key === 'body' ||
        key === 'email' ||
        key === 'password' ||
        key === 'username' ||
        key === 'userId'
      ) {
        continue;
      }

      // Manter apenas valores primitivos ou arrays/objetos válidos
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

  /**
   * Valida se o produto tem os campos mínimos necessários
   */
  private isValidProduct(product: any, supplierType: string): boolean {
    if (!product || typeof product !== 'object') {
      return false;
    }

    // Verificar se não é um objeto aninhado malformado
    if (typeof product.nome === 'object' || typeof product.name === 'object') {
      return false;
    }

    // Verificar se tem propriedades inválidas
    if (product.body || product.email || product.password) {
      return false;
    }

    // Verificar campos obrigatórios por tipo
    if (supplierType === 'brazilian') {
      return !!(product.id && product.nome && product.preco);
    } else {
      return !!(product.id && product.name && product.price);
    }
  }

  /**
   * Normaliza um produto individual
   */
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
      // European provider
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

  /**
   * Converte preço para número, tratando diferentes formatos
   */
  private parsePrice(price: any): number {
    if (typeof price === 'number') {
      return price;
    }

    if (typeof price === 'string') {
      // Remove caracteres não numéricos exceto ponto e vírgula
      const cleaned = price.replace(/[^\d.,]/g, '');
      // Substitui vírgula por ponto
      const normalized = cleaned.replace(',', '.');
      const parsed = parseFloat(normalized);
      return isNaN(parsed) ? 0 : parsed;
    }

    return 0;
  }

  /**
   * Cria ou atualiza um produto externo no banco
   */
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
      // Atualizar produto existente
      return await this.productRepository.save({
        ...existing,
        ...productData,
        updatedAt: new Date(),
      });
    } else {
      // Criar novo produto
      return await this.productRepository.save(productData);
    }
  }
}
