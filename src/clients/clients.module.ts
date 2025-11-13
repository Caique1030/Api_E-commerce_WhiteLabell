import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { Client } from './entities/client.entity';
import { EventsModule } from '../events/events.module'; // Importar o EventsModule

@Module({
  imports: [
    TypeOrmModule.forFeature([Client]),
    EventsModule, // Adicionar o EventsModule
  ],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
