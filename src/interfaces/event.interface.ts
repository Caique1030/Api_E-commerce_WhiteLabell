export interface JwtPayload {
  sub: string;
  clientId?: string;
  role?: string;
  [key: string]: any;
}



export interface EventData<T> {
  message: string;
  data: T;
}

export interface BaseEvent {
  id: string;
  [key: string]: any;
}

export interface ProductEvent extends BaseEvent {
  name?: string;
  description?: string;
  price?: number;
  image?: string;
  clientId?: string;
  supplierId?: string;
  category?: string;
  externalId?: string;
  hasDiscount?: boolean;
  discountValue?: string;
  gallery?: string[];
  details?: any;
  material?: string;
  department?: string;
}

// Evento específico para Fornecedor
export interface SupplierEvent extends BaseEvent {
  name?: string;
  type?: string;
  apiUrl?: string;
  isActive?: boolean;
}

// Evento específico para Cliente
export interface ClientEvent extends BaseEvent {
  name?: string;
  domain?: string;
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  isActive?: boolean;
}
