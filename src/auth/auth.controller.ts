import { Controller, Post, UseGuards, Request, Body, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';

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


  @Post('login')
  @UseGuards(LocalAuthGuard)
  async login(@Req() req: any) {
    const domain = this.extractDomain(req);
    return this.authService.login(req.user, domain);
  }



  @Post('register')
  async register(@Request() req, @Body() registerDto: RegisterDto) {
    const domain = this.extractDomain(req);
    return this.authService.register(registerDto, domain);
  }
}
