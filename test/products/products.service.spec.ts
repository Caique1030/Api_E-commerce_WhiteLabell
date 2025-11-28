import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { REQUEST } from '@nestjs/core';
import { NotFoundException } from '@nestjs/common';
import axios from 'axios';
import { ProductsService } from 'src/products/products.service';
import { Product } from 'src/products/entities/product.entity';
import { SuppliersService } from 'src/suppliers/suppliers.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ProductsService', () => {
  let service: ProductsService;
  let repository: jest.Mocked<Repository<Product>>;
  let suppliersService: jest.Mocked<SuppliersService>;
  let mockRequest: any;

  const mockProduct: Product = {
    id: '1',
    name: 'Test Product',
    description: 'Test Description',
    price: 100,
    image: 'test.jpg',
    gallery: [],
    category: 'Test Category',
    material: 'Test Material',
    department: 'Test Department',
    hasDiscount: false,
    discountValue: '0',
    externalId: 'ext-1',
    supplierId: 'supplier-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    supplier: null,
    orderItems: [],
  };

  const mockSupplier = {
    id: 'supplier-1',
    name: 'Test Supplier',
    apiUrl: 'https://api.supplier.com/products',
    type: 'brazilian',
  };

  beforeEach(async () => {
    mockRequest = {
      client: {
        id: 'client-1',
        name: 'Test Client',
      },
    };

    const mockRepository = {
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const mockSuppliersService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useValue: mockRepository,
        },
        {
          provide: SuppliersService,
          useValue: mockSuppliersService,
        },
        {
          provide: REQUEST,
          useValue: mockRequest,
        },
      ],
    }).compile();

    // Use resolve() instead of get() for scoped providers
    service = await module.resolve<ProductsService>(ProductsService);
    repository = module.get(getRepositoryToken(Product));
    suppliersService = module.get(SuppliersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return products with total count', async () => {
      const products = [mockProduct];
      repository.findAndCount.mockResolvedValue([products, 1]);

      const result = await service.findAll();

      expect(result).toEqual({ products, total: 1 });
      expect(repository.findAndCount).toHaveBeenCalled();
    });

    it('should apply filters correctly', async () => {
      const filters = {
        name: 'Test',
        category: 'Test Category',
        minPrice: 50,
        maxPrice: 150,
        supplierId: 'supplier-1',
        limit: 10,
        offset: 0,
      };

      repository.findAndCount.mockResolvedValue([[mockProduct], 1]);

      await service.findAll(filters);

      expect(repository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 0,
        }),
      );
    });

    it('should handle limit -1 to fetch all products', async () => {
      const filters = { limit: -1 };
      repository.findAndCount.mockResolvedValue([[mockProduct], 1]);

      await service.findAll(filters);

      expect(repository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          take: undefined,
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a product when found', async () => {
      repository.findOne.mockResolvedValue(mockProduct);

      const result = await service.findOne('1');

      expect(result).toEqual(mockProduct);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
        relations: ['supplier'],
      });
    });

    it('should throw NotFoundException when product not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('999')).rejects.toThrow(
        'Produto com ID 999 não encontrado',
      );
    });
  });

  describe('syncProductsFromSuppliers', () => {
    it('should sync products from all suppliers successfully', async () => {
      const brazilianProducts = [
        {
          id: '1',
          nome: 'Produto Brasileiro',
          preco: '100.00',
          descricao: 'Descrição',
          categoria: 'Categoria',
        },
      ];

      suppliersService.findAll.mockResolvedValue([mockSupplier] as any);
      mockedAxios.get.mockResolvedValue({ data: brazilianProducts });
      repository.findOne.mockResolvedValue(null);
      repository.save.mockResolvedValue(mockProduct);

      const result = await service.syncProductsFromSuppliers();

      expect(result.totalSynced).toBeGreaterThan(0);
      expect(result.details).toHaveLength(1);
      expect(result.details[0].status).toBe('success');
    });

    it('should handle errors for individual suppliers', async () => {
      suppliersService.findAll.mockResolvedValue([mockSupplier] as any);
      // Mock axios.get para lançar erro durante a requisição
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      const result = await service.syncProductsFromSuppliers();

      // O serviço captura o erro e retorna status 'error' no results
      expect(result.totalSynced).toBe(0);
      expect(result.details).toHaveLength(1);
      expect(result.details[0].status).toBe('error');
      expect(result.details[0].error).toBe('Network error');
    });

    it('should normalize Brazilian products correctly', async () => {
      const brazilianProducts = [
        {
          id: '1',
          nome: 'Produto',
          preco: '100,50',
          descricao: 'Descrição',
          categoria: 'Cat',
        },
      ];

      suppliersService.findAll.mockResolvedValue([mockSupplier] as any);
      mockedAxios.get.mockResolvedValue({ data: brazilianProducts });
      repository.findOne.mockResolvedValue(null);
      repository.save.mockResolvedValue(mockProduct);

      await service.syncProductsFromSuppliers();

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Produto',
          price: expect.any(Number),
        }),
      );
    });

    it('should normalize European products correctly', async () => {
      const europeanSupplier = { ...mockSupplier, type: 'european' };
      const europeanProducts = [
        {
          id: '1',
          name: 'European Product',
          price: 100.5,
          description: 'Description',
          gallery: ['img1.jpg'],
          details: { adjective: 'Modern', material: 'Wood' },
        },
      ];

      suppliersService.findAll.mockResolvedValue([europeanSupplier] as any);
      mockedAxios.get.mockResolvedValue({ data: europeanProducts });
      repository.findOne.mockResolvedValue(null);
      repository.save.mockResolvedValue(mockProduct);

      await service.syncProductsFromSuppliers();

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'European Product',
          price: 100.5,
        }),
      );
    });

    it('should update existing products instead of creating duplicates', async () => {
      const products = [
        {
          id: 'ext-1',
          nome: 'Updated Product',
          preco: '200.00',
        },
      ];

      suppliersService.findAll.mockResolvedValue([mockSupplier] as any);
      mockedAxios.get.mockResolvedValue({ data: products });
      repository.findOne.mockResolvedValue(mockProduct);
      repository.save.mockResolvedValue({ ...mockProduct, price: 200 });

      await service.syncProductsFromSuppliers();

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '1',
          price: 200,
        }),
      );
    });
  });

  describe('product validation and normalization', () => {
    it('should filter out invalid products', async () => {
      const invalidProducts = [
        { id: '1' }, // Missing name and price
        { nome: 'Product' }, // Missing id and price
        { id: '2', nome: 'Valid', preco: '100' },
      ];

      suppliersService.findAll.mockResolvedValue([mockSupplier] as any);
      mockedAxios.get.mockResolvedValue({ data: invalidProducts });
      repository.findOne.mockResolvedValue(null);
      repository.save.mockResolvedValue(mockProduct);

      const result = await service.syncProductsFromSuppliers();

      // Only 1 valid product should be synced
      expect(result.details[0].synced).toBe(1);
    });

    it('should handle nested and malformed product structures', async () => {
      const malformedProducts = [
        {
          '0': { id: '1', nome: 'Product 1', preco: '100' },
          '1': { id: '2', nome: 'Product 2', preco: '200' },
          nome: 'Container',
          id: '52',
        },
      ];

      suppliersService.findAll.mockResolvedValue([mockSupplier] as any);
      mockedAxios.get.mockResolvedValue({ data: malformedProducts });
      repository.findOne.mockResolvedValue(null);
      repository.save.mockResolvedValue(mockProduct);

      const result = await service.syncProductsFromSuppliers();

      // Should extract and sync nested products
      expect(result.totalSynced).toBeGreaterThan(0);
    });

    it('should parse prices correctly from different formats', async () => {
      const productsWithPrices = [
        { id: '1', nome: 'P1', preco: '100,50' },
        { id: '2', nome: 'P2', preco: 'R$ 200,75' },
        { id: '3', nome: 'P3', preco: 150 },
      ];

      suppliersService.findAll.mockResolvedValue([mockSupplier] as any);
      mockedAxios.get.mockResolvedValue({ data: productsWithPrices });
      repository.findOne.mockResolvedValue(null);
      repository.save.mockResolvedValue(mockProduct);

      await service.syncProductsFromSuppliers();

      expect(repository.save).toHaveBeenCalledTimes(3);
      // All prices should be converted to numbers
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          price: expect.any(Number),
        }),
      );
    });
  });
});
