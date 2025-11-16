import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
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

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);

    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user;
      return result;
    }

    return null;
  }

  async login(user: any, domain: string) {
    console.log('🔎 Dominio recebido no login:', domain);

    const client = await this.clientsService.findByDomain(domain);

    if (!client) {
      throw new UnauthorizedException(
        `Client not found for domain ${domain}`,
      );
    }

    if (user.clientId !== client.id) {
      throw new UnauthorizedException('User does not belong to this client');
    }

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

  async register(registerDto: RegisterDto, domain: string) {
    console.log('🔎 Dominio recebido no register:', domain);

    const { email, password, name, role } = registerDto;

    let client = await this.clientsService.findByDomain(domain);

    if (!client) {
      console.log('⚠️ Cliente não encontrado — criando novo cliente para domínio:', domain);

      client = await this.clientsService.createIfNotExists({
        name: domain + ' Client',
        domain: domain,
        primaryColor: '#2ecc71',
        secondaryColor: '#27ae60',
      });
    }

    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new BadRequestException('E-mail já cadastrado');
    }

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
