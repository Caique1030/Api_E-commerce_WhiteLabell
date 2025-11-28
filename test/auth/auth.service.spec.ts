import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from 'src/auth/auth.service';
import { UsersService } from 'src/users/users.service';
import { ClientsService } from 'src/clients/clients.service';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let clientsService: jest.Mocked<ClientsService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser = {
    id: '1',
    email: 'test@example.com',
    password: 'hashedPassword',
    name: 'Test User',
    role: 'user',
    clientId: 'client-1',
  };

  const mockClient = {
    id: 'client-1',
    name: 'Test Client',
    domain: 'testdomain.com',
    primaryColor: '#2ecc71',
    secondaryColor: '#27ae60',
  };

  beforeEach(async () => {
    const mockUsersService = {
      findByEmail: jest.fn(),
      create: jest.fn(),
    };

    const mockClientsService = {
      findByDomain: jest.fn(),
      createIfNotExists: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: ClientsService,
          useValue: mockClientsService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    clientsService = module.get(ClientsService);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user data without password when credentials are valid', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser(
        'test@example.com',
        'password123',
      );

      expect(result).toEqual({
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        clientId: 'client-1',
      });
      expect(usersService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'password123',
        'hashedPassword',
      );
    });

    it('should return null when user is not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      const result = await service.validateUser(
        'invalid@example.com',
        'password123',
      );

      expect(result).toBeNull();
      expect(usersService.findByEmail).toHaveBeenCalledWith(
        'invalid@example.com',
      );
    });

    it('should return null when password is incorrect', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser(
        'test@example.com',
        'wrongpassword',
      );

      expect(result).toBeNull();
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'wrongpassword',
        'hashedPassword',
      );
    });
  });

  describe('login', () => {
    const userWithoutPassword = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      clientId: 'client-1',
    };

    it('should return access token and user data when login is successful', async () => {
      clientsService.findByDomain.mockResolvedValue(mockClient);
      jwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await service.login(userWithoutPassword, 'testdomain.com');

      expect(result).toEqual({
        access_token: 'mock-jwt-token',
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user',
          clientId: 'client-1',
        },
      });
      expect(clientsService.findByDomain).toHaveBeenCalledWith(
        'testdomain.com',
      );
      expect(jwtService.sign).toHaveBeenCalledWith({
        email: 'test@example.com',
        sub: '1',
        clientId: 'client-1',
      });
    });

    it('should throw UnauthorizedException when client is not found', async () => {
      clientsService.findByDomain.mockResolvedValue(null);

      await expect(
        service.login(userWithoutPassword, 'invaliddomain.com'),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.login(userWithoutPassword, 'invaliddomain.com'),
      ).rejects.toThrow('Client not found for domain invaliddomain.com');
    });

    it('should throw UnauthorizedException when user does not belong to client', async () => {
      const userWithDifferentClient = {
        ...userWithoutPassword,
        clientId: 'different-client',
      };
      clientsService.findByDomain.mockResolvedValue(mockClient);

      await expect(
        service.login(userWithDifferentClient, 'testdomain.com'),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.login(userWithDifferentClient, 'testdomain.com'),
      ).rejects.toThrow('User does not belong to this client');
    });
  });

  describe('register', () => {
    const registerDto = {
      email: 'newuser@example.com',
      password: 'password123',
      name: 'New User',
      role: 'user',
    };

    it('should register a new user with existing client', async () => {
      clientsService.findByDomain.mockResolvedValue(mockClient);
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue({
        ...mockUser,
        email: registerDto.email,
        name: registerDto.name,
      });

      const result = await service.register(registerDto, 'testdomain.com');

      expect(result).toEqual({
        id: '1',
        email: 'newuser@example.com',
        name: 'New User',
        role: 'user',
        clientId: 'client-1',
      });
      expect(clientsService.findByDomain).toHaveBeenCalledWith(
        'testdomain.com',
      );
      expect(usersService.findByEmail).toHaveBeenCalledWith(
        'newuser@example.com',
      );
      expect(usersService.create).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        name: 'New User',
        password: 'password123',
        role: 'user',
        clientId: 'client-1',
      });
    });

    it('should create a new client when domain does not exist', async () => {
      const newClient = {
        id: 'new-client-id',
        name: 'newdomain.com Client',
        domain: 'newdomain.com',
        primaryColor: '#2ecc71',
        secondaryColor: '#27ae60',
      };

      clientsService.findByDomain.mockResolvedValue(null);
      clientsService.createIfNotExists.mockResolvedValue(newClient);
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue({
        ...mockUser,
        email: registerDto.email,
        name: registerDto.name,
        clientId: 'new-client-id',
      });

      const result = await service.register(registerDto, 'newdomain.com');

      expect(clientsService.createIfNotExists).toHaveBeenCalledWith({
        name: 'newdomain.com Client',
        domain: 'newdomain.com',
        primaryColor: '#2ecc71',
        secondaryColor: '#27ae60',
      });
      expect(result.clientId).toBe('new-client-id');
    });

    it('should throw BadRequestException when email already exists', async () => {
      clientsService.findByDomain.mockResolvedValue(mockClient);
      usersService.findByEmail.mockResolvedValue(mockUser);

      await expect(
        service.register(registerDto, 'testdomain.com'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.register(registerDto, 'testdomain.com'),
      ).rejects.toThrow('E-mail já cadastrado');
    });
  });
});
