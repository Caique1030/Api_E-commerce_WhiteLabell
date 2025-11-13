import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { ClientsService } from '../clients/clients.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private clientsService: ClientsService,
  ) {}

  // =========================================================
  // 🔑 1. Validação do usuário (login)
  // =========================================================
  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);

    if (user && await bcrypt.compare(password, user.password)) {
      const { password, ...result } = user;
      return result;
    }

    return null;
  }

  // =========================================================
  // 🔐 2. Login — verifica se o usuário pertence ao domínio
  // =========================================================
  async login(user: any, host: string) {
    // Busca o client com base no domínio do host (ex: localhost:3000)
    const client = await this.clientsService.findByDomain(host);

    if (!client) {
      throw new UnauthorizedException(`Cliente não encontrado para o domínio ${host}`);
    }

    // Verifica se o usuário pertence a esse client
    if (user.clientId !== client.id) {
      throw new UnauthorizedException('Usuário não pertence a este cliente');
    }

    // Gera o token JWT
    const payload = {
      email: user.email,
      sub: user.id,
      clientId: user.clientId,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        clientId: user.clientId,
      },
    };
  }

  // =========================================================
  // 🧾 3. Registro de usuário
  // =========================================================
  async register(registerDto: RegisterDto, host: string) {
    const { email, password, name, role } = registerDto;

    // Verifica se existe client com esse domínio
    let client = await this.clientsService.findByDomain(host);

    // Se não existir, cria automaticamente um client padrão (para ambientes locais)
    if (!client) {
      client = await this.clientsService.createIfNotExists({
        name: 'Localhost Client',
        domain: host,
        primaryColor: '#2ecc71',
        secondaryColor: '#27ae60',
      });
    }

    // Verifica se o e-mail já está em uso
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new BadRequestException('E-mail já cadastrado');
    }


    // Cria o usuário associado ao client correto
    const user = await this.usersService.create({
      email,
      name,
      password,
      role,
      clientId: client.id,
    });

    const { password: _, ...result } = user;
    return result;
  }
}
