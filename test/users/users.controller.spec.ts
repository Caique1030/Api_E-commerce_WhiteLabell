import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { UsersController } from 'src/users/users.controller';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<UsersService>;

  const mockUser = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    clientId: 'client-1',
    password: 'hashedPassword',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUsersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    changePassword: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const createUserDto = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
        role: 'user',
        clientId: 'client-1',
      };

      usersService.create.mockResolvedValue(mockUser as any);

      const result = await controller.create(createUserDto);

      expect(result).toEqual(mockUser);
      expect(usersService.create).toHaveBeenCalledWith(createUserDto);
    });
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const users = [
        mockUser,
        { ...mockUser, id: '2', email: 'another@example.com' },
      ];
      usersService.findAll.mockResolvedValue(users as any);

      const result = await controller.findAll();

      expect(result).toEqual(users);
      expect(usersService.findAll).toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    it('should return the authenticated user profile', async () => {
      const mockRequest = {
        user: { id: '1', email: 'test@example.com' },
      };

      usersService.findOne.mockResolvedValue(mockUser as any);

      const result = await controller.getProfile(mockRequest);

      expect(result).toEqual(mockUser);
      expect(usersService.findOne).toHaveBeenCalledWith('1');
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      usersService.findOne.mockResolvedValue(mockUser as any);

      const result = await controller.findOne('1');

      expect(result).toEqual(mockUser);
      expect(usersService.findOne).toHaveBeenCalledWith('1');
    });
  });

  describe('updateProfile', () => {
    it('should update the authenticated user profile', async () => {
      const mockRequest = {
        user: { id: '1', email: 'test@example.com' },
      };

      const updateUserDto = {
        name: 'Updated Name',
        role: 'admin',
      };

      const updatedUser = { ...mockUser, ...updateUserDto };
      usersService.update.mockResolvedValue(updatedUser as any);

      const result = await controller.updateProfile(mockRequest, updateUserDto);

      expect(result).toEqual(updatedUser);
      expect(usersService.update).toHaveBeenCalledWith('1', updateUserDto);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const mockRequest = {
        user: { id: '1', email: 'test@example.com' },
      };

      const changePasswordDto = {
        oldPassword: 'oldPassword123',
        newPassword: 'newPassword123',
      };

      const response = { message: 'Senha alterada com sucesso' };
      usersService.changePassword.mockResolvedValue(response);

      const result = await controller.changePassword(
        mockRequest,
        changePasswordDto,
      );

      expect(result).toEqual(response);
      expect(usersService.changePassword).toHaveBeenCalledWith(
        '1',
        'oldPassword123',
        'newPassword123',
      );
    });

    it('should throw BadRequestException when old and new passwords are the same', async () => {
      const mockRequest = {
        user: { id: '1', email: 'test@example.com' },
      };

      const changePasswordDto = {
        oldPassword: 'samePassword',
        newPassword: 'samePassword',
      };

      await expect(
        controller.changePassword(mockRequest, changePasswordDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.changePassword(mockRequest, changePasswordDto),
      ).rejects.toThrow('A nova senha deve ser diferente da senha atual');
      expect(usersService.changePassword).not.toHaveBeenCalled();
    });

    it('should allow different passwords', async () => {
      const mockRequest = {
        user: { id: '1', email: 'test@example.com' },
      };

      const changePasswordDto = {
        oldPassword: 'oldPassword',
        newPassword: 'newPassword',
      };

      usersService.changePassword.mockResolvedValue({ message: 'Success' });

      await controller.changePassword(mockRequest, changePasswordDto);

      expect(usersService.changePassword).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update a user by id', async () => {
      const updateUserDto = {
        name: 'Updated Name',
        role: 'admin',
      };

      const updatedUser = { ...mockUser, ...updateUserDto };
      usersService.update.mockResolvedValue(updatedUser as any);

      const result = await controller.update('1', updateUserDto);

      expect(result).toEqual(updatedUser);
      expect(usersService.update).toHaveBeenCalledWith('1', updateUserDto);
    });
  });

  describe('remove', () => {
    it('should remove a user by id', async () => {
      usersService.remove.mockResolvedValue(undefined);

      await controller.remove('1');

      expect(usersService.remove).toHaveBeenCalledWith('1');
    });
  });
});
