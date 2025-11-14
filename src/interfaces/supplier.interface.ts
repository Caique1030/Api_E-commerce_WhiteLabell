export interface SupplierEntity {
  id: string;
  name: string;
  type: 'brazilian' | 'european';
  apiUrl: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
