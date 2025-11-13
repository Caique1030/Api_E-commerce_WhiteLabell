// Define interfaces relacionadas a clientes (lojas)
export interface ClientEntity {
  id: string;
  name: string;
  domain: string;
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Interface para o payload do JWT
export interface JwtPayloadts {
  email: string;
  sub: string;
  clientId?: string;
  role: string;
}

// Interface para o retorno do login
export interface LoginResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    clientId?: string;
  };
}

// Interface para usuário sem senha
export interface UserWithoutPassword {
  id: string;
  email: string;
  name: string;
  role: string;
  clientId?: string;
}
