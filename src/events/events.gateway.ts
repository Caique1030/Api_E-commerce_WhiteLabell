import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import {
  SupplierEvent,
  ProductEvent,
  ClientEvent,
  EventData,
} from '../interfaces';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { JwtService } from '@nestjs/jwt';
import { ConnectedClient } from 'src/interfaces/connected-client.interface';
import { ClientsService } from 'src/clients/clients.service';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: 'events',
})
@Injectable()
export class EventsGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger('EventsGateway');
  private clients: Map<string, ConnectedClient> = new Map();

  constructor(
    private jwtService: JwtService,
    private clientsService: ClientsService,
  ) {}

  afterInit(): void {
    this.logger.log('Socket.io server initialized');
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);

      if (!token) {
        this.handleAuthError(client, 'Authentication token not provided');
        return;
      }

      try {
        const payload = this.jwtService.verify(token);
        const userId = payload.sub;
        const clientId = payload.clientId;
        const role = payload.role;

        const domain = this.extractDomain(client);

        const whitelabelClient = await this.getClientByDomain(domain);

        if (!whitelabelClient) {
          this.handleAuthError(client, `Client not found for domain ${domain}`);
          return;
        }

        if (clientId !== whitelabelClient.id && role !== 'admin') {
          this.handleAuthError(client, 'User does not belong to this domain');
          return;
        }

        this.clients.set(client.id, {
          socket: client,
          userId,
          clientId,
          domain,
          whitelabelId: whitelabelClient.id,
        });

        await client.join(`domain:${whitelabelClient.id}`);

        await client.join(`domain:${whitelabelClient.id}:user:${userId}`);

        await client.join(`domain:${whitelabelClient.id}:client:${clientId}`);

        if (role === 'admin') {
          await client.join(`domain:${whitelabelClient.id}:admins`);
          await client.join('admins');
        }

        this.logger.log(
          `Client connected: ${client.id} - User: ${userId} - Domain: ${domain} - WhitelabelID: ${whitelabelClient.id}`,
        );

        client.emit('connected', {
          message: 'Conectado e autenticado com sucesso!',
          userId,
          clientId,
          domain,
          whitelabelId: whitelabelClient.id,
          rooms: [
            `domain:${whitelabelClient.id}`,
            `domain:${whitelabelClient.id}:user:${userId}`,
            `domain:${whitelabelClient.id}:client:${clientId}`,
            ...(role === 'admin'
              ? [`domain:${whitelabelClient.id}:admins`, 'admins']
              : []),
          ],
        });
      } catch (error) {
        this.handleAuthError(client, `Token inválido: ${error.message}`);
      }
    } catch (error) {
      this.handleAuthError(client, `Erro na conexão: ${error.message}`);
    }
  }

  private extractDomain(client: Socket): string {
    const origin = client.handshake.headers.origin;
    const host = client.handshake.headers.host;

    if (origin) {
      try {
        const url = new URL(origin);
        // Retorna apenas o hostname, sem a porta
        return url.hostname;
      } catch (error) {
        this.logger.error(`Erro ao parsear origin: ${error.message}`);
      }
    }

    // Remove a porta do host também, se existir
    const hostWithoutPort = (host as string)?.split(':')[0];
    return hostWithoutPort || 'unknown';
  }

  private async getClientByDomain(domain: string): Promise<any> {
    try {
      return await this.clientsService.findByDomain(domain);
    } catch (error) {
      this.logger.error(`Erro ao buscar cliente por domínio: ${error.message}`);
      return null;
    }
  }

  private handleAuthError(client: Socket, message: string): void {
    this.logger.warn(`Client rejected: ${message} - ${client.id}`);
    client.emit('auth_error', { message });
    setTimeout(() => client.disconnect(), 1000);
  }

  private extractToken(client: Socket): string | null {
    const authHeader = client.handshake.headers['authorization'];
    if (authHeader) {
      if (typeof authHeader === 'string') {
        if (authHeader.startsWith('Bearer ')) {
          this.logger.debug(
            '✅ Token encontrado no Header Authorization (com Bearer)',
          );
          return authHeader.substring(7);
        } else {
          this.logger.debug(
            '✅ Token encontrado no Header Authorization (sem Bearer)',
          );
          return authHeader;
        }
      }
    }

    const authToken = client.handshake.auth.token;
    if (authToken && typeof authToken === 'string') {
      this.logger.debug('✅ Token encontrado no Auth object');
      return authToken;
    }

    const queryToken = client.handshake.query.token;
    if (queryToken && typeof queryToken === 'string') {
      this.logger.debug('✅ Token encontrado no Query parameter');
      return queryToken;
    }

    this.logger.debug('❌ Nenhum token encontrado em nenhuma fonte');
    return null;
  }

  handleDisconnect(client: Socket): void {
    this.clients.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // === Métodos para Fornecedores ===

  notifySupplierCreated(supplier: SupplierEvent, whitelabelId?: string): void {
    if (whitelabelId) {
      this.server.to(`domain:${whitelabelId}`).emit('supplier:created', {
        message: 'New supplier available',
        data: supplier,
      } as EventData<SupplierEvent>);

      this.server
        .to(`domain:${whitelabelId}:admins`)
        .emit('supplier:created:admin', {
          message: 'New supplier created',
          data: supplier,
          isAdminEvent: true,
        });

      this.logger.debug(
        `Emitted supplier:created event to domain ${whitelabelId} - ${supplier.id}`,
      );
    } else {
      this.server.to('admins').emit('supplier:created', {
        message: 'New supplier created',
        data: supplier,
      } as EventData<SupplierEvent>);

      this.logger.debug(
        `Emitted supplier:created event to all admins - ${supplier.id}`,
      );
    }
  }

  notifySupplierUpdated(supplier: SupplierEvent, whitelabelId?: string): void {
    if (whitelabelId) {
      this.server.to(`domain:${whitelabelId}`).emit('supplier:updated', {
        message: 'Fornecedor atualizado',
        data: supplier,
      } as EventData<SupplierEvent>);

      this.server
        .to(`domain:${whitelabelId}:admins`)
        .emit('supplier:updated:admin', {
          message: 'Updated supplier details',
          data: supplier,
          isAdminEvent: true,
        });

      this.logger.debug(
        `Emitted supplier:updated event to domain ${whitelabelId} - ${supplier.id}`,
      );
    } else {
      this.server.to('admins').emit('supplier:updated', {
        message: 'Updated supplier',
        data: supplier,
      } as EventData<SupplierEvent>);

      this.logger.debug(
        `Emitted supplier:updated event to all admins - ${supplier.id}`,
      );
    }
  }

  notifySupplierRemoved(supplierId: string, whitelabelId?: string): void {
    if (whitelabelId) {
      this.server.to(`domain:${whitelabelId}`).emit('supplier:removed', {
        message: 'Supplier is no longer available',
        data: { id: supplierId },
      } as EventData<{ id: string }>);

      this.server
        .to(`domain:${whitelabelId}:admins`)
        .emit('supplier:removed:admin', {
          message: 'Supplier removed from the system',
          data: { id: supplierId },
          isAdminEvent: true,
        });

      this.logger.debug(
        `Emitted supplier:removed event to domain ${whitelabelId} - ${supplierId}`,
      );
    } else {
      this.server.to('admins').emit('supplier:removed', {
        message: 'Supplier removed',
        data: { id: supplierId },
      } as EventData<{ id: string }>);

      this.logger.debug(
        `Emitted supplier:removed event to all admins - ${supplierId}`,
      );
    }
  }

  // // === Métodos para Clientes ===

  // notifyClientCreated(client: ClientEvent, whitelabelId?: string): void {
  //   // O whitelabelId aqui é o próprio client.id para clientes
  //   const domainId = whitelabelId || client.id;

  //   this.server.to(`domain:${domainId}`).emit('client:created', {
  //     message: 'Nova loja disponível',
  //     data: {
  //       id: client.id,
  //       name: client.name,
  //       domain: client.domain,
  //       primaryColor: client.primaryColor,
  //       secondaryColor: client.secondaryColor,
  //     },
  //   } as EventData<Partial<ClientEvent>>);

  //   this.server.to(`domain:${domainId}:admins`).emit('client:created:admin', {
  //     message: 'Nova loja criada com detalhes completos',
  //     data: client,
  //     isAdminEvent: true,
  //   });

  //   this.server
  //     .to(`domain:${domainId}:client:${client.id}`)
  //     .emit('client:created:member', {
  //       message: 'Sua loja foi configurada',
  //       data: {
  //         name: client.name,
  //         domain: client.domain,
  //         primaryColor: client.primaryColor,
  //         secondaryColor: client.secondaryColor,
  //       },
  //     });

  //   this.logger.debug(
  //     `Emitted client:created event to domain ${domainId} - ${client.id}`,
  //   );
  // }

  // notifyClientUpdated(client: ClientEvent, whitelabelId?: string): void {
  //   // O whitelabelId aqui é o próprio client.id para clientes
  //   const domainId = whitelabelId || client.id;

  //   // CORREÇÃO: Enviar para TODOS os usuários deste domínio
  //   this.server.to(`domain:${domainId}`).emit('client:updated', {
  //     message: 'Loja atualizada',
  //     data: {
  //       id: client.id,
  //       name: client.name,
  //       domain: client.domain,
  //       primaryColor: client.primaryColor,
  //       secondaryColor: client.secondaryColor,
  //     },
  //   } as EventData<Partial<ClientEvent>>);

  //   // Envio específico para admins com informações adicionais
  //   this.server.to(`domain:${domainId}:admins`).emit('client:updated:admin', {
  //     message: 'Loja atualizada com detalhes completos',
  //     data: client,
  //     isAdminEvent: true,
  //   });

  //   // Envio específico para usuários deste cliente
  //   this.server
  //     .to(`domain:${domainId}:client:${client.id}`)
  //     .emit('client:updated:member', {
  //       message: 'Configurações da sua loja foram atualizadas',
  //       data: {
  //         name: client.name,
  //         domain: client.domain,
  //         primaryColor: client.primaryColor,
  //         secondaryColor: client.secondaryColor,
  //       },
  //     });

  //   this.logger.debug(
  //     `Emitted client:updated event to domain ${domainId} - ${client.id}`,
  //   );
  // }

  // notifyClientRemoved(clientId: string, whitelabelId?: string): void {
  //   // O whitelabelId aqui é o próprio clientId para clientes
  //   const domainId = whitelabelId || clientId;

  //   // CORREÇÃO: Enviar para TODOS os usuários deste domínio
  //   this.server.to(`domain:${domainId}`).emit('client:removed', {
  //     message: 'Loja não está mais disponível',
  //     data: { id: clientId },
  //   } as EventData<{ id: string }>);

  //   // Envio específico para admins
  //   this.server.to(`domain:${domainId}:admins`).emit('client:removed:admin', {
  //     message: 'Loja removida do sistema',
  //     data: { id: clientId },
  //     isAdminEvent: true,
  //   });

  //   // Envio específico para usuários deste cliente
  //   this.server
  //     .to(`domain:${domainId}:client:${clientId}`)
  //     .emit('client:removed:member', {
  //       message: 'Esta loja foi desativada',
  //       data: { id: clientId },
  //     });

  //   this.logger.debug(
  //     `Emitted client:removed event to domain ${domainId} - ${clientId}`,
  //   );
  // }

  // === Métodos para Produtos ===

  notifyProductCreated(product: ProductEvent, whitelabelId?: string): void {
    if (!whitelabelId && product.clientId) {
      whitelabelId = product.clientId;
    }

    if (whitelabelId) {
      this.server.to(`domain:${whitelabelId}`).emit('product:created', {
        message: 'New product available',
        data: {
          id: product.id,
          name: product.name,
          price: product.price,
        },
      });

      this.server
        .to(`domain:${whitelabelId}:admins`)
        .emit('product:created:admin', {
          message: 'New product created with complete details',
          data: product,
          isAdminEvent: true,
        });

      if (product.clientId) {
        this.server
          .to(`domain:${whitelabelId}:client:${product.clientId}`)
          .emit('product:created:member', {
            message: 'New product available in your store',
            data: product,
          });
      }

      this.logger.debug(
        `Emitted product:created event to domain ${whitelabelId} - ${product.id}`,
      );
    } else {
      this.server.to('admins').emit('product:created', {
        message: 'New product created',
        data: product,
      } as EventData<ProductEvent>);

      if (product.clientId) {
        this.server.to(`client:${product.clientId}`).emit('product:created', {
          message: 'Novo produto disponível na sua loja',
          data: product,
        } as EventData<ProductEvent>);
      }

      this.logger.debug(`Emitted product:created event to all - ${product.id}`);
    }
  }

  notifyProductUpdated(product: ProductEvent, whitelabelId?: string): void {
    if (!whitelabelId && product.clientId) {
      whitelabelId = product.clientId;
    }

    if (whitelabelId) {
      this.server.to(`domain:${whitelabelId}`).emit('product:updated', {
        message: 'Updated product',
        data: {
          id: product.id,
          name: product.name,
          price: product.price,
        },
      });

      this.server
        .to(`domain:${whitelabelId}:admins`)
        .emit('product:updated:admin', {
          message: 'Product updated with full details',
          data: product,
          isAdminEvent: true,
        });

      if (product.clientId) {
        this.server
          .to(`domain:${whitelabelId}:client:${product.clientId}`)
          .emit('product:updated:member', {
            message: 'Updated product in your store',
            data: product,
          });
      }

      this.logger.debug(
        `Emitted product:updated event to domain ${whitelabelId} - ${product.id}`,
      );
    } else {
      this.server.to('admins').emit('product:updated', {
        message: 'Updated product',
        data: product,
      } as EventData<ProductEvent>);

      if (product.clientId) {
        this.server.to(`client:${product.clientId}`).emit('product:updated', {
          message: 'Updated product in your store',
          data: product,
        } as EventData<ProductEvent>);
      }

      this.logger.debug(`Emitted product:updated event to all - ${product.id}`);
    }
  }

  notifyProductRemoved(
    productId: string,
    clientId?: string,
    whitelabelId?: string,
  ): void {
    if (!whitelabelId && clientId) {
      whitelabelId = clientId;
    }

    if (whitelabelId) {
      this.server.to(`domain:${whitelabelId}`).emit('product:removed', {
        message: 'Product is no longer available',
        data: { id: productId },
      });

      this.server
        .to(`domain:${whitelabelId}:admins`)
        .emit('product:removed:admin', {
          message: 'Product removed from the system',
          data: { id: productId },
          isAdminEvent: true,
        });

      if (clientId) {
        this.server
          .to(`domain:${whitelabelId}:client:${clientId}`)
          .emit('product:removed:member', {
            message: 'Product removed from your store',
            data: { id: productId },
          });
      }

      this.logger.debug(
        `Emitted product:removed event to domain ${whitelabelId} - ${productId}`,
      );
    } else {
      this.server.to('admins').emit('product:removed', {
        message: 'Product removed',
        data: { id: productId },
      } as EventData<{ id: string }>);

      if (clientId) {
        this.server.to(`client:${clientId}`).emit('product:removed', {
          message: 'Product removed from your store',
          data: { id: productId },
        } as EventData<{ id: string }>);
      }

      this.logger.debug(`Emitted product:removed event to all - ${productId}`);
    }
  }
}
