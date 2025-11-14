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

export interface JwtPayloadts {
  email: string;
  sub: string;
  clientId?: string;
  role: string;
}

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

export interface UserWithoutPassword {
  id: string;
  email: string;
  name: string;
  role: string;
  clientId?: string;
}
