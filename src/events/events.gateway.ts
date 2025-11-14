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
        this.handleAuthError(client, 'Token de autenticação não fornecido');
        return;
      }

      try {
        // Decodificar o token JWT
        const payload = this.jwtService.verify(token);
        const userId = payload.sub;
        const clientId = payload.clientId;
        const role = payload.role;

        // Extrair o domínio do handshake
        const domain = this.extractDomain(client);

        // Encontrar o cliente whitelabel com base no domínio
        const whitelabelClient = await this.getClientByDomain(domain);

        if (!whitelabelClient) {
          this.handleAuthError(
            client,
            `Cliente não encontrado para o domínio ${domain}`,
          );
          return;
        }

        // Verificar se o usuário pertence ao cliente do domínio atual
        if (clientId !== whitelabelClient.id && role !== 'admin') {
          this.handleAuthError(client, 'Usuário não pertence a este domínio');
          return;
        }

        // Armazenar informações do cliente conectado
        this.clients.set(client.id, {
          socket: client,
          userId,
          clientId,
          domain,
          whitelabelId: whitelabelClient.id,
        });

        // Sistema de salas aprimorado com isolamento por domínio

        // 1. Sala do domínio - TODOS os usuários deste domínio
        await client.join(`domain:${whitelabelClient.id}`);

        // 2. Sala do usuário individual dentro do domínio
        await client.join(`domain:${whitelabelClient.id}:user:${userId}`);

        // 3. Sala do cliente dentro do domínio
        await client.join(`domain:${whitelabelClient.id}:client:${clientId}`);

        // 4. Sala de admins específica deste domínio (apenas para administradores)
        if (role === 'admin') {
          await client.join(`domain:${whitelabelClient.id}:admins`);
          // Manter sala global de admins para compatibilidade
          await client.join('admins');
        }

        this.logger.log(
          `Client connected: ${client.id} - User: ${userId} - Domain: ${domain} - WhitelabelID: ${whitelabelClient.id}`,
        );

        // Enviar confirmação de conexão bem-sucedida
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

  // Método auxiliar para extrair domínio
  private extractDomain(client: Socket): string {
    const origin = client.handshake.headers.origin;
    const host = client.handshake.headers.host;

    if (origin) {
      try {
        const url = new URL(origin);
        return `${url.hostname}${url.port ? ':' + url.port : ''}`;
      } catch (error) {
        this.logger.error(`Erro ao parsear origin: ${error.message}`);
      }
    }

    return (host as string) || 'unknown';
  }

  // Método auxiliar para buscar cliente pelo domínio
  private async getClientByDomain(domain: string): Promise<any> {
    try {
      return await this.clientsService.findByDomain(domain);
    } catch (error) {
      this.logger.error(`Erro ao buscar cliente por domínio: ${error.message}`);
      return null;
    }
  }

  // Método auxiliar para tratamento de erros de autenticação
  private handleAuthError(client: Socket, message: string): void {
    this.logger.warn(`Client rejected: ${message} - ${client.id}`);
    client.emit('auth_error', { message });
    setTimeout(() => client.disconnect(), 1000);
  }

  private extractToken(client: Socket): string | null {
    // 1. Tentar do Header Authorization (com 'a' minúsculo)
    const authHeader = client.handshake.headers['authorization'];
    if (authHeader) {
      if (typeof authHeader === 'string') {
        // Verificar se tem "Bearer " prefix
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

    // 2. Tentar do Auth object
    const authToken = client.handshake.auth.token;
    if (authToken && typeof authToken === 'string') {
      this.logger.debug('✅ Token encontrado no Auth object');
      return authToken;
    }

    // 3. Tentar do Query parameters
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
      // CORREÇÃO: Enviar para TODOS os usuários deste domínio
      this.server.to(`domain:${whitelabelId}`).emit('supplier:created', {
        message: 'Novo fornecedor disponível',
        data: supplier,
      } as EventData<SupplierEvent>);

      // Envio específico para admins com informações adicionais
      this.server
        .to(`domain:${whitelabelId}:admins`)
        .emit('supplier:created:admin', {
          message: 'Novo fornecedor criado',
          data: supplier,
          isAdminEvent: true,
        });

      this.logger.debug(
        `Emitted supplier:created event to domain ${whitelabelId} - ${supplier.id}`,
      );
    } else {
      // Compatibilidade com o código existente
      this.server.to('admins').emit('supplier:created', {
        message: 'Novo fornecedor criado',
        data: supplier,
      } as EventData<SupplierEvent>);

      this.logger.debug(
        `Emitted supplier:created event to all admins - ${supplier.id}`,
      );
    }
  }

  notifySupplierUpdated(supplier: SupplierEvent, whitelabelId?: string): void {
    if (whitelabelId) {
      // CORREÇÃO: Enviar para TODOS os usuários deste domínio
      this.server.to(`domain:${whitelabelId}`).emit('supplier:updated', {
        message: 'Fornecedor atualizado',
        data: supplier,
      } as EventData<SupplierEvent>);

      // Envio específico para admins com informações adicionais
      this.server
        .to(`domain:${whitelabelId}:admins`)
        .emit('supplier:updated:admin', {
          message: 'Detalhes do fornecedor atualizados',
          data: supplier,
          isAdminEvent: true,
        });

      this.logger.debug(
        `Emitted supplier:updated event to domain ${whitelabelId} - ${supplier.id}`,
      );
    } else {
      // Compatibilidade com o código existente
      this.server.to('admins').emit('supplier:updated', {
        message: 'Fornecedor atualizado',
        data: supplier,
      } as EventData<SupplierEvent>);

      this.logger.debug(
        `Emitted supplier:updated event to all admins - ${supplier.id}`,
      );
    }
  }

  notifySupplierRemoved(supplierId: string, whitelabelId?: string): void {
    if (whitelabelId) {
      // CORREÇÃO: Enviar para TODOS os usuários deste domínio
      this.server.to(`domain:${whitelabelId}`).emit('supplier:removed', {
        message: 'Fornecedor não está mais disponível',
        data: { id: supplierId },
      } as EventData<{ id: string }>);

      // Envio específico para admins com informações adicionais
      this.server
        .to(`domain:${whitelabelId}:admins`)
        .emit('supplier:removed:admin', {
          message: 'Fornecedor removido do sistema',
          data: { id: supplierId },
          isAdminEvent: true,
        });

      this.logger.debug(
        `Emitted supplier:removed event to domain ${whitelabelId} - ${supplierId}`,
      );
    } else {
      // Compatibilidade com o código existente
      this.server.to('admins').emit('supplier:removed', {
        message: 'Fornecedor removido',
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

  //   // CORREÇÃO: Enviar para TODOS os usuários deste domínio
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

  //   // Envio específico para admins com informações adicionais
  //   this.server.to(`domain:${domainId}:admins`).emit('client:created:admin', {
  //     message: 'Nova loja criada com detalhes completos',
  //     data: client,
  //     isAdminEvent: true,
  //   });

  //   // Envio específico para usuários deste cliente
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
      whitelabelId = product.clientId; // Usar clientId como whitelabelId se não fornecido
    }

    if (whitelabelId) {
      // CORREÇÃO: Enviar para TODOS os usuários deste domínio
      this.server.to(`domain:${whitelabelId}`).emit('product:created', {
        message: 'Novo produto disponível',
        data: {
          id: product.id,
          name: product.name,
          price: product.price,
        },
      });

      // Envio específico para admins com informações adicionais
      this.server
        .to(`domain:${whitelabelId}:admins`)
        .emit('product:created:admin', {
          message: 'Novo produto criado com detalhes completos',
          data: product,
          isAdminEvent: true,
        });

      // Envio específico para usuários do cliente deste produto
      if (product.clientId) {
        this.server
          .to(`domain:${whitelabelId}:client:${product.clientId}`)
          .emit('product:created:member', {
            message: 'Novo produto disponível na sua loja',
            data: product,
          });
      }

      this.logger.debug(
        `Emitted product:created event to domain ${whitelabelId} - ${product.id}`,
      );
    } else {
      // Compatibilidade com o código existente
      this.server.to('admins').emit('product:created', {
        message: 'Novo produto criado',
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
      whitelabelId = product.clientId; // Usar clientId como whitelabelId se não fornecido
    }

    if (whitelabelId) {
      // CORREÇÃO: Enviar para TODOS os usuários deste domínio
      this.server.to(`domain:${whitelabelId}`).emit('product:updated', {
        message: 'Produto atualizado',
        data: {
          id: product.id,
          name: product.name,
          price: product.price,
        },
      });

      // Envio específico para admins com informações adicionais
      this.server
        .to(`domain:${whitelabelId}:admins`)
        .emit('product:updated:admin', {
          message: 'Produto atualizado com detalhes completos',
          data: product,
          isAdminEvent: true,
        });

      // Envio específico para usuários do cliente deste produto
      if (product.clientId) {
        this.server
          .to(`domain:${whitelabelId}:client:${product.clientId}`)
          .emit('product:updated:member', {
            message: 'Produto atualizado na sua loja',
            data: product,
          });
      }

      this.logger.debug(
        `Emitted product:updated event to domain ${whitelabelId} - ${product.id}`,
      );
    } else {
      // Compatibilidade com o código existente
      this.server.to('admins').emit('product:updated', {
        message: 'Produto atualizado',
        data: product,
      } as EventData<ProductEvent>);

      if (product.clientId) {
        this.server.to(`client:${product.clientId}`).emit('product:updated', {
          message: 'Produto atualizado na sua loja',
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
      whitelabelId = clientId; // Usar clientId como whitelabelId se não fornecido
    }

    if (whitelabelId) {
      // CORREÇÃO: Enviar para TODOS os usuários deste domínio
      this.server.to(`domain:${whitelabelId}`).emit('product:removed', {
        message: 'Produto não está mais disponível',
        data: { id: productId },
      });

      // Envio específico para admins
      this.server
        .to(`domain:${whitelabelId}:admins`)
        .emit('product:removed:admin', {
          message: 'Produto removido do sistema',
          data: { id: productId },
          isAdminEvent: true,
        });

      // Envio específico para usuários do cliente deste produto
      if (clientId) {
        this.server
          .to(`domain:${whitelabelId}:client:${clientId}`)
          .emit('product:removed:member', {
            message: 'Produto removido da sua loja',
            data: { id: productId },
          });
      }

      this.logger.debug(
        `Emitted product:removed event to domain ${whitelabelId} - ${productId}`,
      );
    } else {
      // Compatibilidade com o código existente
      this.server.to('admins').emit('product:removed', {
        message: 'Produto removido',
        data: { id: productId },
      } as EventData<{ id: string }>);

      if (clientId) {
        this.server.to(`client:${clientId}`).emit('product:removed', {
          message: 'Produto removido da sua loja',
          data: { id: productId },
        } as EventData<{ id: string }>);
      }

      this.logger.debug(`Emitted product:removed event to all - ${productId}`);
    }
  }
}
