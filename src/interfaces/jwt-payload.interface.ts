export interface JwtPayload {
  sub: string;
  email: string; 
  clientId?: string;
  role?: string;
  [key: string]: any; 
}
