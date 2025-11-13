// interfaces/jwt-payload.interface.ts
export interface JwtPayload {
  sub: string; // ID do usuário
  email: string; // Email do usuário
  clientId?: string; // ID do cliente (opcional)
  role?: string; // Função/papel do usuário (opcional)
  [key: string]: any; // Campos adicionais
}
