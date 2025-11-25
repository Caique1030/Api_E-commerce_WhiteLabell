import {
  Controller,
  Post,
  Request,
  Body,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private extractDomain(req): string {
    const rawHeaderDomain = req.headers['x-client-domain'];
    const rawHost = req.headers['x-forwarded-host'] || req.headers['host'];

    const host = (rawHeaderDomain ?? rawHost ?? '').toString();

    console.log('🔎 Domínio bruto:', host);

    return host.split(':')[0].trim();
  }

  // ✅ SEM USAR LocalAuthGuard - Validação direta
  @Post('login')
  async login(@Req() req: any, @Body() loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Valida o usuário diretamente
    const user = await this.authService.validateUser(email, password);

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const domain = this.extractDomain(req);
    return this.authService.login(user, domain);
  }

  @Post('register')
  async register(@Request() req, @Body() registerDto: RegisterDto) {
    const domain = this.extractDomain(req);
    return this.authService.register(registerDto, domain);
  }
}
