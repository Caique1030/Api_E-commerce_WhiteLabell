import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from 'src/orders/orders.controller';
import { OrdersService } from 'src/orders/orders.service';

describe('OrdersController', () => {
  let controller: OrdersController;
  let ordersService: jest.Mocked<OrdersService>;

  const mockOrder = {
    id: 'order-1',
    total: 200,
    status: 'completed',
    clientId: 'client-1',
    userId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [
      {
        id: 'item-1',
        productId: 'prod-1',
        productName: 'Test Product',
        productImage: 'test.jpg',
        quantity: 2,
        price: 100,
        orderId: 'order-1',
      },
    ],
  };

  const mockOrdersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
  };

  const mockRequest = {
    user: {
      id: 'user-1',
      email: 'test@example.com',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: mockOrdersService,
        },
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
    ordersService = module.get(OrdersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new order', async () => {
      const createOrderDto = {
        total: 200,
        items: [
          {
            productId: 'prod-1',
            productName: 'Test Product',
            productImage: 'test.jpg',
            quantity: 2,
            price: 100,
          },
        ],
      };

      ordersService.create.mockResolvedValue(mockOrder as any);

      const result = await controller.create(createOrderDto, mockRequest);

      expect(result).toEqual(mockOrder);
      expect(ordersService.create).toHaveBeenCalledWith(
        createOrderDto,
        'user-1',
      );
    });

    it('should extract userId from authenticated request', async () => {
      const createOrderDto = {
        total: 300,
        items: [],
      };

      ordersService.create.mockResolvedValue(mockOrder as any);

      await controller.create(createOrderDto, mockRequest);

      expect(ordersService.create).toHaveBeenCalledWith(
        createOrderDto,
        'user-1',
      );
    });

    it('should create order with multiple items', async () => {
      const createOrderDto = {
        total: 300,
        items: [
          {
            productId: 'prod-1',
            productName: 'Product 1',
            productImage: 'img1.jpg',
            quantity: 2,
            price: 100,
          },
          {
            productId: 'prod-2',
            productName: 'Product 2',
            productImage: 'img2.jpg',
            quantity: 1,
            price: 100,
          },
        ],
      };

      ordersService.create.mockResolvedValue(mockOrder as any);

      await controller.create(createOrderDto, mockRequest);

      expect(ordersService.create).toHaveBeenCalledWith(
        createOrderDto,
        'user-1',
      );
    });
  });

  describe('findAll', () => {
    it('should return all orders for authenticated user', async () => {
      const orders = [mockOrder, { ...mockOrder, id: 'order-2' }];
      ordersService.findAll.mockResolvedValue(orders as any);

      const result = await controller.findAll(mockRequest);

      expect(result).toEqual(orders);
      expect(ordersService.findAll).toHaveBeenCalledWith('user-1');
    });

    it('should return empty array when user has no orders', async () => {
      ordersService.findAll.mockResolvedValue([]);

      const result = await controller.findAll(mockRequest);

      expect(result).toEqual([]);
      expect(ordersService.findAll).toHaveBeenCalledWith('user-1');
    });

    it('should use userId from request', async () => {
      const differentUserRequest = {
        user: {
          id: 'user-2',
          email: 'another@example.com',
        },
      };

      ordersService.findAll.mockResolvedValue([]);

      await controller.findAll(differentUserRequest);

      expect(ordersService.findAll).toHaveBeenCalledWith('user-2');
    });
  });

  describe('findOne', () => {
    it('should return a specific order for authenticated user', async () => {
      ordersService.findOne.mockResolvedValue(mockOrder as any);

      const result = await controller.findOne('order-1', mockRequest);

      expect(result).toEqual(mockOrder);
      expect(ordersService.findOne).toHaveBeenCalledWith('order-1', 'user-1');
    });

    it('should not return order if it belongs to different user', async () => {
      ordersService.findOne.mockRejectedValue(
        new Error('Pedido não encontrado'),
      );

      await expect(controller.findOne('order-1', mockRequest)).rejects.toThrow(
        'Pedido não encontrado',
      );
    });

    it('should pass both orderId and userId to service', async () => {
      ordersService.findOne.mockResolvedValue(mockOrder as any);

      await controller.findOne('order-123', mockRequest);

      expect(ordersService.findOne).toHaveBeenCalledWith('order-123', 'user-1');
    });

    it('should handle order not found error', async () => {
      ordersService.findOne.mockRejectedValue(
        new Error('Pedido não encontrado'),
      );

      await expect(
        controller.findOne('invalid-id', mockRequest),
      ).rejects.toThrow('Pedido não encontrado');
    });
  });
});
