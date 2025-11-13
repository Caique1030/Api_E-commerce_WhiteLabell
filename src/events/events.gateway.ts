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
  ConnectedClient,
  SupplierEvent,
  ProductEvent,
  ClientEvent,
  EventData,
} from '../interfaces';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: '*', // Em produção, defina para as origens permitidas
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

  constructor(private jwtService: JwtService) {}

  afterInit(): void {
    this.logger.log('Socket.io server initialized');
  }

  handleConnection(client: Socket): void {
    try {
      // Extrair token do handshake
      const token =
        (client.handshake.auth.token as string) ||
        (client.handshake.headers.authorization?.split(' ')[1] as string);

      if (!token) {
        this.logger.warn(
          `Client rejected: No authentication token provided - ${client.id}`,
        );
        client.disconnect();
        return;
      }

      // Verificar token JWT
      try {
        const payload: JwtPayload = this.jwtService.verify(token);

        // Armazenar informações do cliente conectado
        this.clients.set(client.id, {
          socket: client,
          userId: payload.sub,
          clientId: payload.clientId,
        });

        // Adicionar cliente a salas específicas para targeting de eventos
        void client.join(`user:${payload.sub}`);

        if (payload.clientId) {
          void client.join(`client:${payload.clientId}`);
        }

        // Se o usuário for admin, adicionar à sala de admins
        if (payload.role === 'admin') {
          void client.join('admins');
        }

        this.logger.log(
          `Client connected: ${client.id} - User: ${payload.sub} - Client: ${payload.clientId || 'N/A'}`,
        );
      } catch (e) {
        const error = e as Error;
        this.logger.error(`Invalid JWT token: ${error.message}`);
        client.disconnect();
        return;
      }
    } catch (e) {
      const error = e as Error;
      this.logger.error(`Error handling connection: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    this.clients.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // === Métodos para Fornecedores ===

  notifySupplierCreated(supplier: SupplierEvent): void {
    this.server.to('admins').emit('supplier:created', {
      message: 'Novo fornecedor criado',
      data: supplier,
    } as EventData<SupplierEvent>);

    this.logger.debug(`Emitted supplier:created event - ${supplier.id}`);
  }

  notifySupplierUpdated(supplier: SupplierEvent): void {
    this.server.to('admins').emit('supplier:updated', {
      message: 'Fornecedor atualizado',
      data: supplier,
    } as EventData<SupplierEvent>);

    this.logger.debug(`Emitted supplier:updated event - ${supplier.id}`);
  }

  notifySupplierRemoved(supplierId: string): void {
    this.server.to('admins').emit('supplier:removed', {
      message: 'Fornecedor removido',
      data: { id: supplierId },
    } as EventData<{ id: string }>);

    this.logger.debug(`Emitted supplier:removed event - ${supplierId}`);
  }

  // === Métodos para Produtos ===

  notifyProductCreated(product: ProductEvent): void {
    // Notifica admins
    this.server.to('admins').emit('product:created', {
      message: 'Novo produto criado',
      data: product,
    } as EventData<ProductEvent>);

    // Notifica clientes específicos se o produto estiver associado a um cliente
    if (product.clientId) {
      this.server.to(`client:${product.clientId}`).emit('product:created', {
        message: 'Novo produto disponível',
        data: product,
      } as EventData<ProductEvent>);
    }

    this.logger.debug(`Emitted product:created event - ${product.id}`);
  }

  notifyProductUpdated(product: ProductEvent): void {
    // Notifica admins
    this.server.to('admins').emit('product:updated', {
      message: 'Produto atualizado',
      data: product,
    } as EventData<ProductEvent>);

    // Notifica clientes específicos se o produto estiver associado a um cliente
    if (product.clientId) {
      this.server.to(`client:${product.clientId}`).emit('product:updated', {
        message: 'Produto atualizado',
        data: product,
      } as EventData<ProductEvent>);
    }

    this.logger.debug(`Emitted product:updated event - ${product.id}`);
  }

  notifyProductRemoved(productId: string, clientId?: string): void {
    // Notifica admins
    this.server.to('admins').emit('product:removed', {
      message: 'Produto removido',
      data: { id: productId },
    } as EventData<{ id: string }>);

    // Notifica clientes específicos se o produto estiver associado a um cliente
    if (clientId) {
      this.server.to(`client:${clientId}`).emit('product:removed', {
        message: 'Produto não está mais disponível',
        data: { id: productId },
      } as EventData<{ id: string }>);
    }

    this.logger.debug(`Emitted product:removed event - ${productId}`);
  }

  // === Métodos para Clientes ===

  notifyClientCreated(client: ClientEvent): void {
    this.server.to('admins').emit('client:created', {
      message: 'Nova loja criada',
      data: client,
    } as EventData<ClientEvent>);

    this.logger.debug(`Emitted client:created event - ${client.id}`);
  }

  notifyClientUpdated(client: ClientEvent): void {
    this.server.to('admins').emit('client:updated', {
      message: 'Loja atualizada',
      data: client,
    } as EventData<ClientEvent>);

    // Notificar usuários específicos deste cliente
    this.server.to(`client:${client.id}`).emit('client:updated', {
      message: 'Configurações da loja foram atualizadas',
      data: {
        name: client.name,
        domain: client.domain,
        logo: client.logo,
        primaryColor: client.primaryColor,
        secondaryColor: client.secondaryColor,
      },
    } as EventData<Partial<ClientEvent>>);

    this.logger.debug(`Emitted client:updated event - ${client.id}`);
  }

  notifyClientRemoved(clientId: string): void {
    this.server.to('admins').emit('client:removed', {
      message: 'Loja removida',
      data: { id: clientId },
    } as EventData<{ id: string }>);

    this.logger.debug(`Emitted client:removed event - ${clientId}`);
  }
}
