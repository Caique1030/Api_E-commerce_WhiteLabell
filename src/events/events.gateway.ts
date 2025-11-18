import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
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

  // ==================== EVENTOS DE USUÁRIOS ====================

  /**
   * Notifica sobre a atualização de um usuário
   * Envia para o domínio específico e para o próprio usuário
   */
  notifyUserUpdated(user: any, clientId?: string) {
    const event = 'user:updated';
    const sanitizedUser = this.sanitizeUser(user);

    if (clientId) {
      // Emite para todos os usuários do domínio
      this.server.to(`domain:${clientId}`).emit(event, sanitizedUser);

      // Emite especificamente para o usuário que foi atualizado
      if (user.id) {
        this.server
          .to(`domain:${clientId}:user:${user.id}`)
          .emit(event, sanitizedUser);
      }

      this.logger.log(`Emitted ${event} to domain:${clientId}`);
    } else {
      this.server.emit(event, sanitizedUser);
      this.logger.log(`Emitted ${event} to all clients`);
    }
  }

  private sanitizeUser(user: any): any {
    const { password, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  /**
   * Notifica sobre a remoção de um usuário
   * Envia para o domínio específico
   */
  notifyUserRemoved(userId: string, clientId?: string) {
    const event = 'user:removed';
    const payload = { id: userId };

    if (clientId) {
      this.server.to(`domain:${clientId}`).emit(event, payload);
      this.logger.log(`Emitted ${event} to domain:${clientId}`);
    } else {
      this.server.emit(event, payload);
      this.logger.log(`Emitted ${event} to all clients`);
    }
  }

  /**
   * Obtém todos os clientes conectados de um domínio específico
   * Útil para debug e monitoramento
   */
  getConnectedClientsByDomain(domainId: string): ConnectedClient[] {
    const connectedClients: ConnectedClient[] = [];

    for (const [socketId, client] of this.clients.entries()) {
      if (client.whitelabelId === domainId) {
        connectedClients.push(client);
      }
    }

    return connectedClients;
  }

  /**
   * Obtém o total de clientes conectados
   */
  getConnectedClientsCount(): number {
    return this.clients.size;
  }

  /**
   * Verifica se um usuário específico está conectado
   */
  isUserConnected(userId: string, clientId?: string): boolean {
    for (const [socketId, client] of this.clients.entries()) {
      if (client.userId === userId) {
        if (clientId) {
          return client.whitelabelId === clientId;
        }
        return true;
      }
    }
    return false;
  }
}
