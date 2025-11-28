import { Test, TestingModule } from '@nestjs/testing';
import { SuppliersService } from '../../src/suppliers/suppliers.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Supplier } from '../../src/suppliers/entities/supplier.entity';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { REQUEST } from '@nestjs/core';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { of, throwError } from 'rxjs';

describe('SuppliersService', () => {
  let service: SuppliersService;
  let repository: jest.Mocked<Repository<Supplier>>;
  let httpService: jest.Mocked<HttpService>;
  let mockRequest: any;
  let mockSupplier: Supplier;

  beforeEach(async () => {
    // Resetar o mockSupplier antes de cada teste
    mockSupplier = {
      id: '1',
      name: 'Test Supplier',
      apiUrl: 'https://api.supplier.com/products',
      type: 'brazilian',
      createdAt: new Date(),
      updatedAt: new Date(),
      products: [],
    };

    mockRequest = {
      client: {
        id: 'client-1',
        name: 'Test Client',
      },
    };

    const mockRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    const mockHttpService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuppliersService,
        {
          provide: getRepositoryToken(Supplier),
          useValue: mockRepository,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: REQUEST,
          useValue: mockRequest,
        },
      ],
    }).compile();

    service = module.get<SuppliersService>(SuppliersService);
    repository = module.get(getRepositoryToken(Supplier));
    httpService = module.get(HttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new supplier successfully', async () => {
      const createSupplierDto = {
        name: 'New Supplier',
        apiUrl: 'https://api.newsupplier.com/products',
        type: 'european',
      };

      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(mockSupplier);
      repository.save.mockResolvedValue(mockSupplier);

      const result = await service.create(createSupplierDto);

      expect(result).toEqual(mockSupplier);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { name: 'New Supplier' },
      });
      expect(repository.create).toHaveBeenCalledWith(createSupplierDto);
      expect(repository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException when name already exists', async () => {
      const createSupplierDto = {
        name: 'Existing Supplier',
        apiUrl: 'https://api.supplier.com/products',
        type: 'brazilian',
      };

      repository.findOne.mockResolvedValue(mockSupplier);

      await expect(service.create(createSupplierDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createSupplierDto)).rejects.toThrow(
        'Nome já está em uso',
      );
    });
  });

  describe('findAll', () => {
    it('should return an array of suppliers', async () => {
      const suppliers = [
        mockSupplier,
        { ...mockSupplier, id: '2', name: 'Another Supplier' },
      ];
      repository.find.mockResolvedValue(suppliers);

      const result = await service.findAll();

      expect(result).toEqual(suppliers);
      expect(repository.find).toHaveBeenCalled();
    });

    it('should return empty array when no suppliers exist', async () => {
      repository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a supplier when found', async () => {
      repository.findOne.mockResolvedValue(mockSupplier);

      const result = await service.findOne('1');

      expect(result).toEqual(mockSupplier);
      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
    });

    it('should throw NotFoundException when supplier not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('999')).rejects.toThrow(
        'Fornecedor com ID 999 não encontrado',
      );
    });
  });

  describe('update', () => {
    it('should update supplier successfully', async () => {
      const updateDto = {
        name: 'Updated Supplier',
        apiUrl: 'https://api.updated.com/products',
      };

      const updatedSupplier = { ...mockSupplier, ...updateDto };

      repository.findOne.mockResolvedValue(mockSupplier);
      repository.save.mockResolvedValue(updatedSupplier);

      const result = await service.update('1', updateDto);

      expect(result).toEqual(updatedSupplier);
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining(updateDto),
      );
    });

    it('should throw NotFoundException when supplier does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update('999', { name: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should remove supplier successfully', async () => {
      repository.findOne.mockResolvedValue(mockSupplier);
      repository.remove.mockResolvedValue(mockSupplier);

      await service.remove('1');

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(repository.remove).toHaveBeenCalledWith(mockSupplier);
    });

    it('should throw NotFoundException when supplier does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('fetchProductsFromSupplier', () => {
    it('should fetch products from supplier API successfully', async () => {
      const mockProducts = [
        { id: '1', name: 'Product 1', price: 100 },
        { id: '2', name: 'Product 2', price: 200 },
      ];

      repository.findOne.mockResolvedValue(mockSupplier);
      httpService.get.mockReturnValue(of({ data: mockProducts } as any));

      const result = await service.fetchProductsFromSupplier('1');

      expect(result).toEqual(mockProducts);
      expect(httpService.get).toHaveBeenCalledWith(
        'https://api.supplier.com/products',
      );
    });

    it('should throw error when API request fails', async () => {
      repository.findOne.mockResolvedValue(mockSupplier);
      httpService.get.mockReturnValue(
        throwError(() => new Error('Network error')),
      );

      await expect(service.fetchProductsFromSupplier('1')).rejects.toThrow(
        'Failed to fetch products from supplier: Network error',
      );
    });

    it('should throw NotFoundException when supplier does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.fetchProductsFromSupplier('999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('fetchProductByIdFromSupplier', () => {
    it('should fetch a specific product from supplier API', async () => {
      const mockProduct = {
        id: 'prod-1',
        name: 'Specific Product',
        price: 150,
      };

      repository.findOne.mockResolvedValue(mockSupplier);
      httpService.get.mockReturnValue(of({ data: mockProduct } as any));

      const result = await service.fetchProductByIdFromSupplier('1', 'prod-1');

      expect(result).toEqual(mockProduct);
      expect(httpService.get).toHaveBeenCalledWith(
        'https://api.supplier.com/products/prod-1',
      );
    });

    it('should throw error when fetching specific product fails', async () => {
      repository.findOne.mockResolvedValue(mockSupplier);
      httpService.get.mockReturnValue(
        throwError(() => new Error('Product not found')),
      );

      await expect(
        service.fetchProductByIdFromSupplier('1', 'invalid'),
      ).rejects.toThrow(
        'Failed to fetch product from supplier: Product not found',
      );
    });

    it('should throw NotFoundException when supplier does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.fetchProductByIdFromSupplier('999', 'prod-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
