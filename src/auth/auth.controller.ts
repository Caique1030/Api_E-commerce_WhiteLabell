import { Controller, Post, UseGuards, Request, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private extractDomain(req): string {
    const headerDomain = req.headers['x-client-domain'];
    const host = req.get('host');

    // Log para debug
    console.log('🔎 X-Client-Domain recebido:', headerDomain);
    console.log('🔎 Host recebido:', host);

    return headerDomain?.toString().trim() || host;
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req, @Body() loginDto: LoginDto) {
    const domain = this.extractDomain(req);
    return this.authService.login(req.user, domain);
  }

  @Post('register')
  async register(@Request() req, @Body() registerDto: RegisterDto) {
    const domain = this.extractDomain(req);
    return this.authService.register(registerDto, domain);
  }
}
