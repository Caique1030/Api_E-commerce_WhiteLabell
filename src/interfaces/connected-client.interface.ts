import { Socket } from 'socket.io';

export interface ConnectedClient {
  socket: Socket; 
  userId?: string;
  clientId?: string;
  domain?: string;
  whitelabelId?: string;
}
