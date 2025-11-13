import { Controller, Post, UseGuards, Request, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 🟢 Login
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req, @Body() loginDto: LoginDto) {
    const host = req.get('host'); // ← domínio atual
    return this.authService.login(req.user, host);
  }

  // 🟣 Registro
  @Post('register')
  async register(@Request() req, @Body() registerDto: RegisterDto) {
    const host = req.get('host'); // ← domínio atual
    return this.authService.register(registerDto, host);
  }
}
