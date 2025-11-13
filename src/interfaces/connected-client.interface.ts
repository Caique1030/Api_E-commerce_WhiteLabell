// interfaces/connected-client.interface.ts
import { Socket } from 'socket.io';

export interface ConnectedClient {
  socket: Socket; // Usando o tipo Socket ao invés de any
  userId?: string;
  clientId?: string;
}
