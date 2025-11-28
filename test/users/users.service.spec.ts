import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { REQUEST } from '@nestjs/core';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from 'src/users/users.service';
import { User } from 'src/users/entities/user.entity';

jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let repository: jest.Mocked<Repository<User>>;
  let mockRequest: any;

  const mockUser: User = {
    id: '1',
    email: 'test@example.com',
    password: 'hashedPassword',
    name: 'Test User',
    role: 'user',
    clientId: 'client-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    client: null,
    orders: [],
  };

  beforeEach(async () => {
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
        {
          provide: REQUEST,
          useValue: mockRequest,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new user successfully', async () => {
      const createUserDto = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
        role: 'user',
        clientId: 'client-1',
      };

      repository.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
      repository.create.mockReturnValue({
        ...mockUser,
        ...createUserDto,
      } as User);
      repository.save.mockResolvedValue({
        ...mockUser,
        ...createUserDto,
      } as User);

      const result = await service.create(createUserDto);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { email: 'newuser@example.com' },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(repository.create).toHaveBeenCalledWith({
        ...createUserDto,
        password: 'hashedPassword123',
      });
      expect(repository.save).toHaveBeenCalled();
      expect(result.email).toBe('newuser@example.com');
    });

    it('should throw ConflictException when email already exists', async () => {
      const createUserDto = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Existing User',
        role: 'user',
        clientId: 'client-1',
      };

      repository.findOne.mockResolvedValue(mockUser);

      await expect(service.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createUserDto)).rejects.toThrow(
        'Email já está em uso',
      );
    });
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const users = [
        mockUser,
        { ...mockUser, id: '2', email: 'another@example.com' },
      ];
      repository.find.mockResolvedValue(users);

      const result = await service.findAll();

      expect(result).toEqual(users);
      expect(repository.find).toHaveBeenCalled();
    });

    it('should return an empty array when no users exist', async () => {
      repository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a user when found', async () => {
      repository.findOne.mockResolvedValue(mockUser);

      const result = await service.findOne('1');

      expect(result).toEqual(mockUser);
      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
    });

    it('should throw NotFoundException when user is not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('999')).rejects.toThrow(
        'Usuário com ID 999 não encontrado',
      );
    });
  });

  describe('findByEmail', () => {
    it('should return a user when found by email', async () => {
      repository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should return null when user is not found', async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update user successfully', async () => {
      const updateUserDto = {
        name: 'Updated Name',
        role: 'admin',
      };

      const updatedUser = { ...mockUser, ...updateUserDto };

      repository.findOne.mockResolvedValue(mockUser);
      repository.save.mockResolvedValue(updatedUser);

      const result = await service.update('1', updateUserDto);

      expect(result.name).toBe('Updated Name');
      expect(result.role).toBe('admin');
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining(updateUserDto),
      );
    });

    it('should not update password field', async () => {
      const updateUserDto = {
        name: 'Updated Name',
        password: 'newpassword',
      };

      repository.findOne.mockResolvedValue(mockUser);
      repository.save.mockResolvedValue(mockUser);

      await service.update('1', updateUserDto);

      expect(repository.save).toHaveBeenCalledWith(
        expect.not.objectContaining({ password: 'newpassword' }),
      );
    });

    it('should throw NotFoundException when user does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update('999', { name: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      repository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedPassword');
      repository.save.mockResolvedValue({
        ...mockUser,
        password: 'newHashedPassword',
      });

      const result = await service.changePassword(
        '1',
        'oldPassword',
        'newPassword',
      );

      expect(result).toEqual({ message: 'Senha alterada com sucesso' });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'oldPassword',
        'hashedPassword',
      );
      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword', 10);
      expect(repository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException when old password is incorrect', async () => {
      repository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword('1', 'wrongPassword', 'newPassword'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.changePassword('1', 'wrongPassword', 'newPassword'),
      ).rejects.toThrow('Senha atual incorreta');
    });

    it('should throw BadRequestException when new password is same as old password', async () => {
      repository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.changePassword('1', 'password', 'password'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.changePassword('1', 'password', 'password'),
      ).rejects.toThrow('A nova senha deve ser diferente da senha atual');
    });

    it('should throw NotFoundException when user does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.changePassword('999', 'oldPass', 'newPass'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove user successfully', async () => {
      repository.findOne.mockResolvedValue(mockUser);
      repository.remove.mockResolvedValue(mockUser);

      await service.remove('1');

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(repository.remove).toHaveBeenCalledWith(mockUser);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove('999')).rejects.toThrow(NotFoundException);
    });
  });
});
