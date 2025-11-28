import { Test, TestingModule } from '@nestjs/testing';
import { SuppliersController } from 'src/suppliers/suppliers.controller';
import { SuppliersService } from 'src/suppliers/suppliers.service';

describe('SuppliersController', () => {
  let controller: SuppliersController;
  let suppliersService: jest.Mocked<SuppliersService>;

  const mockSupplier = {
    id: 'supplier-1',
    name: 'Test Supplier',
    apiUrl: 'https://api.supplier.com/products',
    type: 'brazilian',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProduct = {
    id: 'prod-1',
    name: 'Test Product',
    price: 100,
  };

  const mockSuppliersService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    fetchProductsFromSupplier: jest.fn(),
    fetchProductByIdFromSupplier: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SuppliersController],
      providers: [
        {
          provide: SuppliersService,
          useValue: mockSuppliersService,
        },
      ],
    }).compile();

    controller = module.get<SuppliersController>(SuppliersController);
    suppliersService = module.get(SuppliersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return an array of suppliers', async () => {
      const suppliers = [
        mockSupplier,
        { ...mockSupplier, id: 'supplier-2', name: 'Another Supplier' },
      ];
      suppliersService.findAll.mockResolvedValue(suppliers as any);

      const result = await controller.findAll();

      expect(result).toEqual(suppliers);
      expect(suppliersService.findAll).toHaveBeenCalled();
    });

    it('should return empty array when no suppliers exist', async () => {
      suppliersService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a single supplier', async () => {
      suppliersService.findOne.mockResolvedValue(mockSupplier as any);

      const result = await controller.findOne('supplier-1');

      expect(result).toEqual(mockSupplier);
      expect(suppliersService.findOne).toHaveBeenCalledWith('supplier-1');
    });

    it('should forward errors from service', async () => {
      suppliersService.findOne.mockRejectedValue(
        new Error('Supplier not found'),
      );

      await expect(controller.findOne('invalid-id')).rejects.toThrow(
        'Supplier not found',
      );
    });
  });

  describe('fetchProductsFromSupplier', () => {
    it('should fetch products from a supplier', async () => {
      const products = [
        mockProduct,
        { ...mockProduct, id: 'prod-2', name: 'Product 2' },
      ];
      suppliersService.fetchProductsFromSupplier.mockResolvedValue(products);

      const result = await controller.fetchProductsFromSupplier('supplier-1');

      expect(result).toEqual(products);
      expect(suppliersService.fetchProductsFromSupplier).toHaveBeenCalledWith(
        'supplier-1',
      );
    });

    it('should return empty array when supplier has no products', async () => {
      suppliersService.fetchProductsFromSupplier.mockResolvedValue([]);

      const result = await controller.fetchProductsFromSupplier('supplier-1');

      expect(result).toEqual([]);
    });

    it('should handle API errors', async () => {
      suppliersService.fetchProductsFromSupplier.mockRejectedValue(
        new Error('Failed to fetch products'),
      );

      await expect(
        controller.fetchProductsFromSupplier('supplier-1'),
      ).rejects.toThrow('Failed to fetch products');
    });

    it('should handle network errors', async () => {
      suppliersService.fetchProductsFromSupplier.mockRejectedValue(
        new Error('Failed to fetch products from supplier: Network error'),
      );

      await expect(
        controller.fetchProductsFromSupplier('supplier-1'),
      ).rejects.toThrow('Network error');
    });
  });

  describe('fetchProductByIdFromSupplier', () => {
    it('should fetch a specific product from supplier', async () => {
      suppliersService.fetchProductByIdFromSupplier.mockResolvedValue(
        mockProduct,
      );

      const result = await controller.fetchProductByIdFromSupplier(
        'supplier-1',
        'prod-1',
      );

      expect(result).toEqual(mockProduct);
      expect(
        suppliersService.fetchProductByIdFromSupplier,
      ).toHaveBeenCalledWith('supplier-1', 'prod-1');
    });

    it('should handle product not found error', async () => {
      suppliersService.fetchProductByIdFromSupplier.mockRejectedValue(
        new Error('Product not found'),
      );

      await expect(
        controller.fetchProductByIdFromSupplier('supplier-1', 'invalid-prod'),
      ).rejects.toThrow('Product not found');
    });

    it('should handle invalid supplier id', async () => {
      suppliersService.fetchProductByIdFromSupplier.mockRejectedValue(
        new Error('Fornecedor com ID invalid-supplier não encontrado'),
      );

      await expect(
        controller.fetchProductByIdFromSupplier('invalid-supplier', 'prod-1'),
      ).rejects.toThrow('não encontrado');
    });

    it('should pass both supplier and product ids to service', async () => {
      suppliersService.fetchProductByIdFromSupplier.mockResolvedValue(
        mockProduct,
      );

      await controller.fetchProductByIdFromSupplier(
        'supplier-123',
        'product-456',
      );

      expect(
        suppliersService.fetchProductByIdFromSupplier,
      ).toHaveBeenCalledWith('supplier-123', 'product-456');
    });
  });
});
