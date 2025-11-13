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

async handleConnection(client: Socket): Promise<void> {
  try {
    const token = this.extractToken(client);
    
    if (!token) {
      this.logger.warn(`Client rejected: No authentication token provided - ${client.id}`);
      client.emit('auth_error', { 
        message: 'Token de autenticação não fornecido' 
      });
      setTimeout(() => client.disconnect(), 1000);
      return;
    }

    // Verificar token JWT
    try {
      const payload = this.jwtService.verify(token);
      
      // Armazenar informações do cliente conectado
      this.clients.set(client.id, {
        socket: client,
        userId: payload.sub,
        clientId: payload.clientId,
      });

      // ✅ CORREÇÃO: Sistema de salas melhorado
      
      // 1. Sala do usuário individual (para mensagens privadas)
      await client.join(`user:${payload.sub}`);
      
      // 2. Sala do cliente (DOMÍNIO) - TODOS os usuários deste cliente
      if (payload.clientId) {
        await client.join(`client:${payload.clientId}`);
        this.logger.debug(`👥 Usuário ${payload.sub} entrou na sala do cliente: ${payload.clientId}`);
      }
      
      // 3. Sala de admins (apenas para administradores)
      if (payload.role === 'admin') {
        await client.join('admins');
        this.logger.debug(`👑 Usuário ${payload.sub} é admin, entrou na sala de admins`);
      }

      this.logger.log(`Client connected: ${client.id} - User: ${payload.sub} - Client: ${payload.clientId || 'N/A'} - Role: ${payload.role}`);
      
      // Enviar confirmação de conexão bem-sucedida
      client.emit('connected', {
        message: 'Conectado e autenticado com sucesso!',
        userId: payload.sub,
        clientId: payload.clientId,
        role: payload.role,
        rooms: ['user:' + payload.sub, 'client:' + payload.clientId, ...(payload.role === 'admin' ? ['admins'] : [])]
      });

    } catch (error) {
      this.logger.error(`Invalid JWT token: ${error.message}`);
      client.emit('auth_error', { 
        message: `Token inválido: ${error.message}` 
      });
      setTimeout(() => client.disconnect(), 1000);
      return;
    }

  } catch (error) {
    this.logger.error(`Error handling connection: ${error.message}`);
    client.emit('auth_error', { 
      message: `Erro na conexão: ${error.message}` 
    });
    setTimeout(() => client.disconnect(), 1000);
  }
}

// 🔥 ADICIONE ESTE MÉTODO PARA EXTRAIR O TOKEN CORRETAMENTE
private extractToken(client: Socket): string | null {
  // 1. Tentar do Header Authorization (com 'a' minúsculo)
  const authHeader = client.handshake.headers['authorization'];
  if (authHeader) {
    if (typeof authHeader === 'string') {
      // Verificar se tem "Bearer " prefix
      if (authHeader.startsWith('Bearer ')) {
        this.logger.debug('✅ Token encontrado no Header Authorization (com Bearer)');
        return authHeader.substring(7);
      } else {
        this.logger.debug('✅ Token encontrado no Header Authorization (sem Bearer)');
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

  // === Métodos para Clientes ===

notifyClientCreated(client: ClientEvent): void {
  // ✅ CORREÇÃO: Enviar para admins E para o próprio cliente
  this.server.to('admins').emit('client:created', {
    message: 'Nova loja criada',
    data: client,
  } as EventData<ClientEvent>);

  // ✅ NOVO: Enviar para todos os usuários deste cliente
  this.server.to(`client:${client.id}`).emit('client:created', {
    message: 'Sua loja foi configurada',
    data: {
      name: client.name,
      domain: client.domain,
      primaryColor: client.primaryColor,
      secondaryColor: client.secondaryColor,
    },
  } as EventData<Partial<ClientEvent>>);

  this.logger.debug(`Emitted client:created event - ${client.id}`);
}

notifyClientUpdated(client: ClientEvent): void {
  // ✅ CORREÇÃO: Enviar para admins E para o próprio cliente
  this.server.to('admins').emit('client:updated', {
    message: 'Loja atualizada',
    data: client,
  } as EventData<ClientEvent>);

  // ✅ CORREÇÃO: Enviar para todos os usuários deste cliente
  this.server.to(`client:${client.id}`).emit('client:updated', {
    message: 'Configurações da loja foram atualizadas',
    data: {
      name: client.name,
      domain: client.domain,
      primaryColor: client.primaryColor,
      secondaryColor: client.secondaryColor,
    },
  } as EventData<Partial<ClientEvent>>);

  this.logger.debug(`Emitted client:updated event - ${client.id}`);
}

notifyClientRemoved(clientId: string): void {
  // ✅ CORREÇÃO: Enviar para admins E notificar usuários do cliente removido
  this.server.to('admins').emit('client:removed', {
    message: 'Loja removida',
    data: { id: clientId },
  } as EventData<{ id: string }>);

  // ✅ NOVO: Notificar usuários que a loja foi removida
  this.server.to(`client:${clientId}`).emit('client:removed', {
    message: 'Esta loja não está mais disponível',
    data: { id: clientId },
  } as EventData<{ id: string }>);

  this.logger.debug(`Emitted client:removed event - ${clientId}`);
}

// === Métodos para Produtos ===

notifyProductCreated(product: ProductEvent): void {
  // ✅ CORREÇÃO: Enviar para admins E para o cliente do produto
  this.server.to('admins').emit('product:created', {
    message: 'Novo produto criado',
    data: product,
  } as EventData<ProductEvent>);

  // ✅ CORREÇÃO: Se o produto tem clientId, enviar para todos do cliente
  if (product.clientId) {
    this.server.to(`client:${product.clientId}`).emit('product:created', {
      message: 'Novo produto disponível na sua loja',
      data: product,
    } as EventData<ProductEvent>);
  }

  this.logger.debug(`Emitted product:created event - ${product.id}`);
}

notifyProductUpdated(product: ProductEvent): void {
  // ✅ CORREÇÃO: Enviar para admins E para o cliente do produto
  this.server.to('admins').emit('product:updated', {
    message: 'Produto atualizado',
    data: product,
  } as EventData<ProductEvent>);

  // ✅ CORREÇÃO: Se o produto tem clientId, enviar para todos do cliente
  if (product.clientId) {
    this.server.to(`client:${product.clientId}`).emit('product:updated', {
      message: 'Produto atualizado na sua loja',
      data: product,
    } as EventData<ProductEvent>);
  }

  this.logger.debug(`Emitted product:updated event - ${product.id}`);
}

notifyProductRemoved(productId: string, clientId?: string): void {
  // ✅ CORREÇÃO: Enviar para admins E para o cliente do produto
  this.server.to('admins').emit('product:removed', {
    message: 'Produto removido',
    data: { id: productId },
  } as EventData<{ id: string }>);

  // ✅ CORREÇÃO: Se o produto tem clientId, enviar para todos do cliente
  if (clientId) {
    this.server.to(`client:${clientId}`).emit('product:removed', {
      message: 'Produto removido da sua loja',
      data: { id: productId },
    } as EventData<{ id: string }>);
  }

  this.logger.debug(`Emitted product:removed event - ${productId}`);
}
}
