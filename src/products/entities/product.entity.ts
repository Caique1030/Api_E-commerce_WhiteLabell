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

  @Column({ nullable: true })
  name: string;

  @Column({nullable: true}{ nullable: true, type: 'text' })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ nullable: true })
  image: string;

  @Column({ type: 'simple-array', nullable: true })
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

  @Column({ type: 'json', nullable: true })
  details: any;

  @Column({ nullable: true })
  externalId: string;

  @Column({ name: 'external_id', nullable: true })
  externalId: string;


  @ManyToOne(() => Supplier)
  @JoinColumn({ name: 'supplierId' })
  supplier: Supplier;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
