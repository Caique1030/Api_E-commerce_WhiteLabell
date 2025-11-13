import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product } from './entities/product.entity';
import { SuppliersModule } from '../suppliers/suppliers.module';
import { EventsModule } from '../events/events.module'; // Importar o EventsModule

@Module({
  imports: [
    TypeOrmModule.forFeature([Product]),
    SuppliersModule,
    EventsModule, // Adicionar o EventsModule
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
