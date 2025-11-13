// Define interfaces relacionadas a fornecedores
export interface SupplierEntity {
  id: string;
  name: string;
  type: 'brazilian' | 'european'; // Tipo específico para identificar o fornecedor
  apiUrl: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
