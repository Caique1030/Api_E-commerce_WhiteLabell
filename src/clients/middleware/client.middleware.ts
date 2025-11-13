import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ClientsService } from '../clients.service';

@Injectable()
export class ClientMiddleware implements NestMiddleware {
  constructor(private readonly clientsService: ClientsService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const host = req.headers.host;

    try {
      const client = await this.clientsService.findByDomain(host || '');
      req['client'] = client;
    } catch {
      // Se não encontrar o cliente, deixa o req.client como undefined
      console.log(`Client not found for host: ${host}`);
    }

    next();
  }
}
