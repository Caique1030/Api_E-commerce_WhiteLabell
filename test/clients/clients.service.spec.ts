import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { Client } from 'src/clients/entities/client.entity';
import { ClientsService } from 'src/clients/clients.service';

describe('ClientsService', () => {
  let service: ClientsService;
  let repository: jest.Mocked<Repository<Client>>;

  const mockClient: Client = {
    id: 'client-1',
    name: 'Test Client',
    domain: 'testdomain.com',
    primaryColor: '#2ecc71',
    secondaryColor: '#27ae60',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    users: [],
    orders: [],
  };

  beforeEach(async () => {
    const mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientsService,
        {
          provide: getRepositoryToken(Client),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ClientsService>(ClientsService);
    repository = module.get(getRepositoryToken(Client));
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
      repository.find.mockResolvedValue(clients);

      const result = await service.findAll();

      expect(result).toEqual(clients);
      expect(repository.find).toHaveBeenCalled();
    });

    it('should return empty array when no clients exist', async () => {
      repository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a client with users relation', async () => {
      const clientWithUsers = {
        ...mockClient,
        users: [{ id: 'user-1', email: 'user@test.com' }],
      };
      repository.findOne.mockResolvedValue(clientWithUsers as any);

      const result = await service.findOne('client-1');

      expect(result).toEqual(clientWithUsers);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'client-1' },
        relations: ['users'],
      });
    });

    it('should throw NotFoundException when client not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('invalid-id')).rejects.toThrow(
        'Customer with ID invalid-id not found',
      );
    });
  });

  describe('findByDomain', () => {
    it('should return an active client by domain', async () => {
      repository.findOne.mockResolvedValue(mockClient);

      const result = await service.findByDomain('testdomain.com');

      expect(result).toEqual(mockClient);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { domain: 'testdomain.com', isActive: true },
      });
    });

    it('should throw NotFoundException when domain not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findByDomain('invaliddomain.com')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findByDomain('invaliddomain.com')).rejects.toThrow(
        'Customer with domain invaliddomain.com not found',
      );
    });

    it('should not return inactive clients', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findByDomain('inactivedomain.com')).rejects.toThrow(
        NotFoundException,
      );

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { domain: 'inactivedomain.com', isActive: true },
      });
    });
  });

  describe('createIfNotExists', () => {
    it('should return existing client if domain already exists', async () => {
      repository.findOne.mockResolvedValue(mockClient);

      const result = await service.createIfNotExists({
        domain: 'testdomain.com',
        name: 'Test Client',
      });

      expect(result).toEqual(mockClient);
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should create new client if domain does not exist', async () => {
      const newClientData = {
        domain: 'newdomain.com',
        name: 'New Client',
        primaryColor: '#3498db',
        secondaryColor: '#2980b9',
      };

      const createdClient = {
        ...mockClient,
        ...newClientData,
        id: 'new-client-id',
      };

      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(createdClient);
      repository.save.mockResolvedValue(createdClient);

      const result = await service.createIfNotExists(newClientData);

      expect(result).toEqual(createdClient);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { domain: 'newdomain.com' },
      });
      expect(repository.create).toHaveBeenCalledWith(newClientData);
      expect(repository.save).toHaveBeenCalledWith(createdClient);
    });

    it('should handle partial client data', async () => {
      const partialData = {
        domain: 'partialdomain.com',
        name: 'Partial Client',
      };

      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue({ ...mockClient, ...partialData });
      repository.save.mockResolvedValue({ ...mockClient, ...partialData });

      await service.createIfNotExists(partialData);

      expect(repository.create).toHaveBeenCalledWith(partialData);
    });

    it('should check for existing client before creating', async () => {
      repository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockClient);
      repository.create.mockReturnValue(mockClient);
      repository.save.mockResolvedValue(mockClient);

      await service.createIfNotExists({
        domain: 'testdomain.com',
        name: 'Test',
      });

      expect(repository.findOne).toHaveBeenCalledTimes(1);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { domain: 'testdomain.com' },
      });
    });
  });
});
