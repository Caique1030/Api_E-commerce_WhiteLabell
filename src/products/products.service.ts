import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindManyOptions } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SuppliersService } from '../suppliers/suppliers.service';
import { FilterProductsDto } from './dto/filter-products.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly suppliersService: SuppliersService,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const newProduct = this.productRepository.create(createProductDto);
    return this.productRepository.save(newProduct);
  }

  async findAll(filters?: FilterProductsDto): Promise<{ products: Product[], total: number }> {
    const where: any = {};
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

    if (filters?.minPrice) {
      where.price = where.price || {};
      where.price = { ...where.price, gte: filters.minPrice };
    }

    if (filters?.maxPrice) {
      where.price = where.price || {};
      where.price = { ...where.price, lte: filters.maxPrice };
    }

    if (filters?.supplierId) {
      where.supplierId = filters.supplierId;
    }

    if (Object.keys(where).length > 0) {
      options.where = where;
    }

    const [products, total] = await this.productRepository.findAndCount(options);
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

  async update(id: string, updateProductDto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);
    Object.assign(product, updateProductDto);
    return this.productRepository.save(product);
  }

  async remove(id: string): Promise<void> {
    const product = await this.findOne(id);
    await this.productRepository.remove(product);
  }

  async syncProductsFromSuppliers(): Promise<void> {
    const suppliers = await this.suppliersService.findAll();
    
    for (const supplier of suppliers) {
      if (!supplier.isActive) continue;
      
      try {
        const products = await this.suppliersService.fetchProductsFromSupplier(supplier.id);
        
        for (const externalProduct of products) {
          // Procurar se o produto já existe no banco de dados
          const existingProduct = await this.productRepository.findOne({
            where: {
              externalId: String(externalProduct.id),
              supplierId: supplier.id,
            },
          });

          // Mapear dados com base no tipo de fornecedor
          let productData;
          
          if (supplier.type === 'brazilian') {
            // Fornecedor brasileiro
            productData = {
              name: externalProduct.nome || externalProduct.name,
              description: externalProduct.descricao,
              price: parseFloat(externalProduct.preco),
              image: externalProduct.imagem,
              category: externalProduct.categoria,
              material: externalProduct.material,
              department: externalProduct.departamento,
              externalId: String(externalProduct.id),
              supplierId: supplier.id,
            };
          } else {
            // Fornecedor europeu
            productData = {
              name: externalProduct.name,
              description: externalProduct.description,
              price: parseFloat(externalProduct.price),
              image: externalProduct.gallery?.[0],
              gallery: externalProduct.gallery,
              hasDiscount: externalProduct.hasDiscount,
              discountValue: externalProduct.discountValue,
              details: externalProduct.details,
              externalId: String(externalProduct.id),
              supplierId: supplier.id,
            };
          }

          if (existingProduct) {
            // Atualizar produto existente
            Object.assign(existingProduct, productData);
            await this.productRepository.save(existingProduct);
          } else {
            // Criar novo produto
            const newProduct = this.productRepository.create(productData);
            await this.productRepository.save(newProduct);
          }
        }
      } catch (error) {
        console.error(`Error syncing products from supplier ${supplier.name}:`, error);
      }
    }
  }
}
