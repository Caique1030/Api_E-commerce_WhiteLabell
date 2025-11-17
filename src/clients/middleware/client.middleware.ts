import { BadRequestException, Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ClientsService } from '../clients.service';
import { Repository } from 'typeorm/repository/Repository.js';
import { Client } from '../entities/client.entity';
import { InjectRepository } from '@nestjs/typeorm/dist/common';

@Injectable()
export class ClientMiddleware implements NestMiddleware {
  constructor(
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
   let host = req.headers['x-forwarded-host'] || req.headers['host'];

if (!host) {
  throw new BadRequestException('Host header not found');
}

host = Array.isArray(host) ? host[0] : host;

// remove a porta, exemplo: localhost:3000 -> localhost
const domain = host.split(':')[0];

const client = await this.clientRepository.findOne({
  where: { domain },
});

if (!client) {
  throw new UnauthorizedException(`Client not found for host: ${domain}`);
}

(req as any).client = client;
next();
  }
}

