import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from 'src/products/products.controller';
import { ProductsService } from 'src/products/products.service';

describe('ProductsController', () => {
  let controller: ProductsController;
  let productsService: jest.Mocked<ProductsService>;

  const mockProduct = {
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
  };

  const mockProductsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    syncProductsFromSuppliers: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
    productsService = module.get(ProductsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return products with total count', async () => {
      const mockResponse = {
        products: [mockProduct],
        total: 1,
      };

      productsService.findAll.mockResolvedValue(mockResponse as any);

      const result = await controller.findAll({});

      expect(result).toEqual(mockResponse);
      expect(productsService.findAll).toHaveBeenCalledWith({});
    });

    it('should pass filters to service', async () => {
      const filters = {
        name: 'Test',
        category: 'Category',
        minPrice: 50,
        maxPrice: 150,
        limit: 10,
        offset: 0,
      };

      productsService.findAll.mockResolvedValue({
        products: [mockProduct],
        total: 1,
      } as any);

      await controller.findAll(filters);

      expect(productsService.findAll).toHaveBeenCalledWith(filters);
    });

    it('should handle empty filters', async () => {
      productsService.findAll.mockResolvedValue({
        products: [],
        total: 0,
      } as any);

      const result = await controller.findAll({});

      expect(result.products).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should handle pagination filters', async () => {
      const filters = {
        limit: 20,
        offset: 40,
      };

      productsService.findAll.mockResolvedValue({
        products: [mockProduct],
        total: 100,
      } as any);

      await controller.findAll(filters);

      expect(productsService.findAll).toHaveBeenCalledWith(filters);
    });
  });

  describe('findOne', () => {
    it('should return a single product', async () => {
      productsService.findOne.mockResolvedValue(mockProduct as any);

      const result = await controller.findOne('1');

      expect(result).toEqual(mockProduct);
      expect(productsService.findOne).toHaveBeenCalledWith('1');
    });

    it('should forward errors from service', async () => {
      productsService.findOne.mockRejectedValue(new Error('Product not found'));

      await expect(controller.findOne('invalid-id')).rejects.toThrow(
        'Product not found',
      );
    });
  });

  describe('syncProducts', () => {
    it('should sync products from all suppliers', async () => {
      const mockSyncResponse = {
        message: 'Products synchronized successfully',
        totalSynced: 150,
        details: [
          {
            supplier: 'Supplier 1',
            type: 'brazilian',
            synced: 100,
            errors: 0,
            total: 100,
            status: 'success' as const,
          },
          {
            supplier: 'Supplier 2',
            type: 'european',
            synced: 50,
            errors: 0,
            total: 50,
            status: 'success' as const,
          },
        ],
      };

      productsService.syncProductsFromSuppliers.mockResolvedValue(
        mockSyncResponse,
      );

      const result = await controller.syncProducts();

      expect(result).toEqual(mockSyncResponse);
      expect(productsService.syncProductsFromSuppliers).toHaveBeenCalled();
    });

    it('should handle sync errors', async () => {
      const mockSyncResponse = {
        message: 'Products synchronized successfully',
        totalSynced: 50,
        details: [
          {
            supplier: 'Supplier 1',
            synced: 50,
            status: 'success' as const,
          },
          {
            supplier: 'Supplier 2',
            synced: 0,
            error: 'Network error',
            status: 'error' as const,
          },
        ],
      };

      productsService.syncProductsFromSuppliers.mockResolvedValue(
        mockSyncResponse,
      );

      const result = await controller.syncProducts();

      expect(result.totalSynced).toBe(50);
      expect(result.details).toHaveLength(2);
      expect(result.details[1].status).toBe('error');
    });

    it('should handle complete sync failure', async () => {
      productsService.syncProductsFromSuppliers.mockRejectedValue(
        new Error('All suppliers failed'),
      );

      await expect(controller.syncProducts()).rejects.toThrow(
        'All suppliers failed',
      );
    });
  });
});
