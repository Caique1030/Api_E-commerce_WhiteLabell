import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Supplier } from '../../suppliers/entities/supplier.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  description: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column({ nullable: true })
  image: string;

  @Column('simple-json', { nullable: true })
  gallery: string[];

  @Column({ nullable: true })
  category: string;

  @Column({ nullable: true })
  material: string;

  @Column({ nullable: true })
  department: string;

  @Column({ nullable: true })
  discountValue: string;

  @Column({ default: false })
  hasDiscount: boolean;

  @Column('simple-json', { nullable: true })
  details: Record<string, any>;

  @Column()
  externalId: string; // ID do produto no fornecedor

  @ManyToOne(() => Supplier, (supplier) => supplier.products)
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @Column({ name: 'supplier_id' })
  supplierId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
