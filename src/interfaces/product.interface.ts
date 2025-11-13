// Define interfaces relacionadas a produtos
export interface ProductEntity {
  id: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  gallery?: string[];
  category?: string;
  material?: string;
  department?: string;
  discountValue?: string;
  hasDiscount?: boolean;
  details?: any;
  externalId?: string;
  supplierId: string;
  clientId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductFilters {
  name?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  supplierId?: string;
  offset?: number;
  limit?: number;
}

export interface ExternalProductBrazilian {
  id: string | number;
  nome?: string;
  name?: string;
  descricao?: string;
  preco?: string | number;
  imagem?: string;
  categoria?: string;
  material?: string;
  departamento?: string;
  [key: string]: any;
}

export interface ExternalProductEuropean {
  id: string | number;
  name?: string;
  description?: string;
  price?: string | number;
  gallery?: string[];
  hasDiscount?: boolean;
  discountValue?: string;
  details?: string;
  [key: string]: any;
}
