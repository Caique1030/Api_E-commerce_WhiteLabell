import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuppliersService } from './suppliers.service';
import { SuppliersController } from './suppliers.controller';
import { Supplier } from './entities/supplier.entity';
import { HttpModule } from '@nestjs/axios';
import { EventsModule } from '../events/events.module'; // Importar o EventsModule

@Module({
  imports: [
    TypeOrmModule.forFeature([Supplier]),
    HttpModule,
    EventsModule, // Adicionar o EventsModule
  ],
  controllers: [SuppliersController],
  providers: [SuppliersService],
  exports: [SuppliersService],
})
export class SuppliersModule {}
