import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Supplier } from '../../suppliers/entities/supplier.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  image: string;

  // ✅ CORRIGIDO: gallery deve ser array de texto no PostgreSQL
  @Column({ type: 'text', array: true, nullable: true })
  gallery: string[];

  @Column({ type: 'varchar', length: 255, nullable: true })
  category: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  material: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  department: string;

  // ✅ CORRIGIDO: Adicionar mapeamento de coluna
  @Column({
    name: 'discount_value',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  discountValue: string;

  // ✅ CORRIGIDO: Adicionar mapeamento de coluna
  @Column({ name: 'has_discount', type: 'boolean', default: false })
  hasDiscount: boolean;

  // ✅ CORRIGIDO: Adicionar tipo JSONB
  @Column({ type: 'jsonb', nullable: true })
  details: any;

  @Column({ name: 'external_id', type: 'varchar', length: 255, nullable: true })
  externalId: string;

  @Column({ name: 'supplier_id', type: 'uuid', nullable: true })
  supplierId: string;

  @ManyToOne(() => Supplier, { nullable: true })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  // ✅ ADICIONAR: Coluna client_id que existe no banco
  @Column({ name: 'client_id', type: 'uuid', nullable: true })
  clientId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
