import { Test, TestingModule } from '@nestjs/testing';
import { ClientsController } from 'src/clients/clients.controller';
import { ClientsService } from 'src/clients/clients.service';

describe('ClientsController', () => {
  let controller: ClientsController;
  let clientsService: jest.Mocked<ClientsService>;

  const mockClient = {
    id: 'client-1',
    name: 'Test Client',
    domain: 'testdomain.com',
    primaryColor: '#2ecc71',
    secondaryColor: '#27ae60',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockClientsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByDomain: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientsController],
      providers: [
        {
          provide: ClientsService,
          useValue: mockClientsService,
        },
      ],
    }).compile();

    controller = module.get<ClientsController>(ClientsController);
    clientsService = module.get(ClientsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return an array of clients', async () => {
      const clients = [
        mockClient,
        { ...mockClient, id: 'client-2', domain: 'anotherdomain.com' },
      ];
      clientsService.findAll.mockResolvedValue(clients as any);

      const result = await controller.findAll();

      expect(result).toEqual(clients);
      expect(clientsService.findAll).toHaveBeenCalled();
    });

    it('should return empty array when no clients exist', async () => {
      clientsService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findCurrent', () => {
    it('should return client by domain from host header', async () => {
      clientsService.findByDomain.mockResolvedValue(mockClient as any);

      const result = await controller.findCurrent('testdomain.com');

      expect(result).toEqual(mockClient);
      expect(clientsService.findByDomain).toHaveBeenCalledWith(
        'testdomain.com',
      );
    });

    it('should handle domain with port', async () => {
      clientsService.findByDomain.mockResolvedValue(mockClient as any);

      await controller.findCurrent('testdomain.com:3000');

      expect(clientsService.findByDomain).toHaveBeenCalledWith(
        'testdomain.com:3000',
      );
    });

    it('should throw error when domain not found', async () => {
      clientsService.findByDomain.mockRejectedValue(
        new Error('Customer with domain invaliddomain.com not found'),
      );

      await expect(controller.findCurrent('invaliddomain.com')).rejects.toThrow(
        'Customer with domain invaliddomain.com not found',
      );
    });

    it('should not return inactive clients', async () => {
      clientsService.findByDomain.mockRejectedValue(
        new Error('Customer with domain inactivedomain.com not found'),
      );

      await expect(
        controller.findCurrent('inactivedomain.com'),
      ).rejects.toThrow('not found');
    });
  });

  describe('findOne', () => {
    it('should return a single client with relations', async () => {
      const clientWithUsers = {
        ...mockClient,
        users: [{ id: 'user-1', email: 'user@test.com' }],
      };
      clientsService.findOne.mockResolvedValue(clientWithUsers as any);

      const result = await controller.findOne('client-1');

      expect(result).toEqual(clientWithUsers);
      expect(clientsService.findOne).toHaveBeenCalledWith('client-1');
    });

    it('should throw error when client not found', async () => {
      clientsService.findOne.mockRejectedValue(
        new Error('Customer with ID invalid-id not found'),
      );

      await expect(controller.findOne('invalid-id')).rejects.toThrow(
        'Customer with ID invalid-id not found',
      );
    });

    it('should return client without users if they do not exist', async () => {
      const clientWithoutUsers = {
        ...mockClient,
        users: [],
      };
      clientsService.findOne.mockResolvedValue(clientWithoutUsers as any);

      const result = await controller.findOne('client-1');

      expect(result.users).toEqual([]);
    });
  });
});
