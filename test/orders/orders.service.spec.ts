import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { REQUEST } from '@nestjs/core';
import { OrdersService } from 'src/orders/orders.service';
import { Order } from 'src/orders/entities/order.entity';
import { OrderItem } from 'src/orders/entities/order-item.entity';

describe('OrdersService', () => {
  let service: OrdersService;
  let orderRepository: jest.Mocked<Repository<Order>>;
  let orderItemRepository: jest.Mocked<Repository<OrderItem>>;
  let mockRequest: any;

  const mockClient = {
    id: 'client-1',
    name: 'Test Client',
    domain: 'testdomain.com',
  };

  const mockOrderItem: OrderItem = {
    id: '1',
    productId: 'prod-1',
    productName: 'Test Product',
    productImage: 'test.jpg',
    quantity: 2,
    price: 100,
    orderId: 'order-1',
    order: null,
    product: null,
  };

  const mockOrder: Order = {
    id: 'order-1',
    total: 200,
    status: 'completed',
    clientId: 'client-1',
    userId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [mockOrderItem],
    user: null,
    client: null,
  };

  beforeEach(async () => {
    mockRequest = {
      client: mockClient,
    };

    const mockOrderRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const mockOrderItemRepository = {
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepository,
        },
        {
          provide: getRepositoryToken(OrderItem),
          useValue: mockOrderItemRepository,
        },
        {
          provide: REQUEST,
          useValue: mockRequest,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    orderRepository = module.get(getRepositoryToken(Order));
    orderItemRepository = module.get(getRepositoryToken(OrderItem));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an order with items successfully', async () => {
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

      const orderWithoutItems = {
        id: 'order-1',
        total: 200,
        status: 'completed',
        clientId: 'client-1',
        userId: 'user-1',
      };

      orderRepository.create.mockReturnValue(orderWithoutItems as Order);
      orderRepository.save.mockResolvedValue(orderWithoutItems as Order);
      orderItemRepository.create.mockReturnValue(mockOrderItem);
      orderItemRepository.save.mockResolvedValue([mockOrderItem]);

      const result = await service.create(createOrderDto, 'user-1');

      expect(result.total).toBe(200);
      expect(result.userId).toBe('user-1');
      expect(result.clientId).toBe('client-1');
      expect(result.status).toBe('completed');
      expect(result.items).toHaveLength(1);
      expect(orderRepository.create).toHaveBeenCalledWith({
        total: 200,
        clientId: 'client-1',
        userId: 'user-1',
        status: 'completed',
      });
      expect(orderItemRepository.save).toHaveBeenCalled();
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

      const orderWithoutItems = {
        id: 'order-1',
        total: 300,
        status: 'completed',
        clientId: 'client-1',
        userId: 'user-1',
      };

      const items = createOrderDto.items.map((item, idx) => ({
        ...item,
        id: `item-${idx}`,
        orderId: 'order-1',
      }));

      orderRepository.create.mockReturnValue(orderWithoutItems as Order);
      orderRepository.save.mockResolvedValue(orderWithoutItems as Order);
      orderItemRepository.create.mockImplementation(
        (item) => item as OrderItem,
      );
      orderItemRepository.save.mockResolvedValue(items as OrderItem[]);

      const result = await service.create(createOrderDto, 'user-1');

      expect(result.items).toHaveLength(2);
      expect(orderItemRepository.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('findAll', () => {
    it('should return all orders for a user', async () => {
      const orders = [mockOrder, { ...mockOrder, id: 'order-2' }];
      orderRepository.find.mockResolvedValue(orders);

      const result = await service.findAll('user-1');

      expect(result).toEqual(orders);
      expect(orderRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        relations: ['items', 'items.product'],
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty array when user has no orders', async () => {
      orderRepository.find.mockResolvedValue([]);

      const result = await service.findAll('user-1');

      expect(result).toEqual([]);
    });

    it('should order results by creation date descending', async () => {
      const orders = [
        { ...mockOrder, id: 'order-2', createdAt: new Date('2024-01-02') },
        { ...mockOrder, id: 'order-1', createdAt: new Date('2024-01-01') },
      ];
      orderRepository.find.mockResolvedValue(orders);

      await service.findAll('user-1');

      expect(orderRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { createdAt: 'DESC' },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a specific order for a user', async () => {
      orderRepository.findOne.mockResolvedValue(mockOrder);

      const result = await service.findOne('order-1', 'user-1');

      expect(result).toEqual(mockOrder);
      expect(orderRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'order-1', userId: 'user-1' },
        relations: ['items', 'items.product'],
      });
    });

    it('should throw error when order not found', async () => {
      orderRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('invalid-id', 'user-1')).rejects.toThrow(
        'Pedido não encontrado',
      );
    });

    it('should not return order if it belongs to different user', async () => {
      orderRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne('order-1', 'different-user'),
      ).rejects.toThrow('Pedido não encontrado');

      expect(orderRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'order-1', userId: 'different-user' },
        relations: ['items', 'items.product'],
      });
    });

    it('should include order items and product relations', async () => {
      orderRepository.findOne.mockResolvedValue(mockOrder);

      await service.findOne('order-1', 'user-1');

      expect(orderRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: ['items', 'items.product'],
        }),
      );
    });
  });
});
