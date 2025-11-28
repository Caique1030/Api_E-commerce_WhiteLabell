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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiHeader,
} from '@nestjs/swagger';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private extractDomain(req): string {
    const rawHeaderDomain = req.headers['x-client-domain'];
    const rawHost = req.headers['x-forwarded-host'] || req.headers['host'];

    const host = (rawHeaderDomain ?? rawHost ?? '').toString();
    return host.split(':')[0].trim();
  }

  @ApiOperation({ summary: 'User login' })
  @ApiBody({ type: LoginDto })
  @ApiHeader({
    name: 'x-client-domain',
    description: 'Client domain',
    required: false,
  })
  @ApiHeader({
    name: 'x-forwarded-host',
    description: 'Forwarded host',
    required: false,
  })
  @ApiHeader({
    name: 'host',
    description: 'Host',
    required: false,
  })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @Post('login')
  async login(@Req() req: any, @Body() loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.authService.validateUser(email, password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const domain = this.extractDomain(req);
    return this.authService.login(user, domain);
  }

  @ApiOperation({ summary: 'User registration' })
  @ApiBody({ type: RegisterDto })
  @ApiHeader({
    name: 'x-client-domain',
    description: 'Client domain',
    required: false,
  })
  @ApiHeader({
    name: 'x-forwarded-host',
    description: 'Forwarded host',
    required: false,
  })
  @ApiHeader({
    name: 'host',
    description: 'Host',
    required: false,
  })
  @ApiResponse({ status: 201, description: 'Registration successful' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @Post('register')
  async register(@Request() req, @Body() registerDto: RegisterDto) {
    const domain = this.extractDomain(req);
    return this.authService.register(registerDto, domain);
  }
}