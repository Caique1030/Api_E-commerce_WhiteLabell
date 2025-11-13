// Define interfaces comuns/compartilhadas
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
}

export interface WhereClause {
  [key: string]: any;
}
