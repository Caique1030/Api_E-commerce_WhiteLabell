import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Client } from '../../clients/entities/client.entity';
import { Exclude } from 'class-transformer';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

@Column({ unique: true, nullable: false })
email: string;

@Column({ nullable: false })
name: string;

  @Column({ nullable: false })
  @Exclude()
  password: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 'user' })
  role: string;

  @ManyToOne(() => Client, (client) => client.users, { eager: true })
  @JoinColumn({ name: 'client_id' })
  client: Client;
@Column({ name: 'client_id', nullable: true })
clientId: string;


  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
