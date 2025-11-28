import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { AuthController } from 'src/auth/auth.controller';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockAuthService = {
    validateUser: jest.fn(),
    login: jest.fn(),
    register: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    const mockRequest = {
      headers: {
        'x-client-domain': 'testdomain.com',
      },
    };

    const mockUser = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      clientId: 'client-1',
    };

    const mockLoginResponse = {
      access_token: 'jwt-token',
      user: mockUser,
    };

    it('should login successfully with valid credentials', async () => {
      authService.validateUser.mockResolvedValue(mockUser);
      authService.login.mockResolvedValue(mockLoginResponse);

      const result = await controller.login(mockRequest, loginDto);

      expect(result).toEqual(mockLoginResponse);
      expect(authService.validateUser).toHaveBeenCalledWith(
        'test@example.com',
        'password123',
      );
      expect(authService.login).toHaveBeenCalledWith(
        mockUser,
        'testdomain.com',
      );
    });

    it('should throw UnauthorizedException with invalid credentials', async () => {
      authService.validateUser.mockResolvedValue(null);

      await expect(controller.login(mockRequest, loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(controller.login(mockRequest, loginDto)).rejects.toThrow(
        'Credenciais inválidas',
      );
      expect(authService.login).not.toHaveBeenCalled();
    });

    it('should extract domain from x-client-domain header', async () => {
      authService.validateUser.mockResolvedValue(mockUser);
      authService.login.mockResolvedValue(mockLoginResponse);

      await controller.login(mockRequest, loginDto);

      expect(authService.login).toHaveBeenCalledWith(
        mockUser,
        'testdomain.com',
      );
    });

    it('should extract domain from x-forwarded-host header when x-client-domain is not present', async () => {
      const requestWithForwardedHost = {
        headers: {
          'x-forwarded-host': 'forwarded.com',
        },
      };

      authService.validateUser.mockResolvedValue(mockUser);
      authService.login.mockResolvedValue(mockLoginResponse);

      await controller.login(requestWithForwardedHost, loginDto);

      expect(authService.login).toHaveBeenCalledWith(mockUser, 'forwarded.com');
    });

    it('should extract domain from host header as fallback', async () => {
      const requestWithHost = {
        headers: {
          host: 'localhost:3000',
        },
      };

      authService.validateUser.mockResolvedValue(mockUser);
      authService.login.mockResolvedValue(mockLoginResponse);

      await controller.login(requestWithHost, loginDto);

      expect(authService.login).toHaveBeenCalledWith(mockUser, 'localhost');
    });

    it('should remove port from domain', async () => {
      const requestWithPort = {
        headers: {
          'x-client-domain': 'testdomain.com:8080',
        },
      };

      authService.validateUser.mockResolvedValue(mockUser);
      authService.login.mockResolvedValue(mockLoginResponse);

      await controller.login(requestWithPort, loginDto);

      expect(authService.login).toHaveBeenCalledWith(
        mockUser,
        'testdomain.com',
      );
    });
  });

  describe('register', () => {
    const registerDto = {
      email: 'newuser@example.com',
      password: 'password123',
      name: 'New User',
      role: 'user',
    };

    const mockRequest = {
      headers: {
        'x-client-domain': 'testdomain.com',
      },
    };

    const mockRegisteredUser = {
      id: '1',
      email: 'newuser@example.com',
      name: 'New User',
      role: 'user',
      clientId: 'client-1',
    };

    it('should register a new user successfully', async () => {
      authService.register.mockResolvedValue(mockRegisteredUser);

      const result = await controller.register(mockRequest, registerDto);

      expect(result).toEqual(mockRegisteredUser);
      expect(authService.register).toHaveBeenCalledWith(
        registerDto,
        'testdomain.com',
      );
    });

    it('should extract domain from headers for registration', async () => {
      authService.register.mockResolvedValue(mockRegisteredUser);

      await controller.register(mockRequest, registerDto);

      expect(authService.register).toHaveBeenCalledWith(
        registerDto,
        'testdomain.com',
      );
    });

    it('should handle registration with different domain sources', async () => {
      const requestWithHost = {
        headers: {
          host: 'anotherdomain.com',
        },
      };

      authService.register.mockResolvedValue(mockRegisteredUser);

      await controller.register(requestWithHost, registerDto);

      expect(authService.register).toHaveBeenCalledWith(
        registerDto,
        'anotherdomain.com',
      );
    });

    it('should forward registration errors from service', async () => {
      authService.register.mockRejectedValue(new Error('Email já cadastrado'));

      await expect(
        controller.register(mockRequest, registerDto),
      ).rejects.toThrow('Email já cadastrado');
    });
  });

  describe('extractDomain', () => {
    it('should handle empty headers', async () => {
      const requestWithEmptyHeaders = {
        headers: {},
      };

      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      authService.validateUser.mockResolvedValue({
        id: '1',
        email: 'test@example.com',
        name: 'Test',
        role: 'user',
        clientId: 'client-1',
      });
      authService.login.mockResolvedValue({} as any);

      await controller.login(requestWithEmptyHeaders, loginDto);

      expect(authService.login).toHaveBeenCalledWith(expect.anything(), '');
    });

    it('should trim whitespace from domain', async () => {
      const requestWithSpaces = {
        headers: {
          'x-client-domain': '  testdomain.com  ',
        },
      };

      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      authService.validateUser.mockResolvedValue({
        id: '1',
        email: 'test@example.com',
        name: 'Test',
        role: 'user',
        clientId: 'client-1',
      });
      authService.login.mockResolvedValue({} as any);

      await controller.login(requestWithSpaces, loginDto);

      expect(authService.login).toHaveBeenCalledWith(
        expect.anything(),
        'testdomain.com',
      );
    });
  });
});
