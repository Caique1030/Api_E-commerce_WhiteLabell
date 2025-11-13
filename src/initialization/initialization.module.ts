import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InitializationService } from './initialization.service';
import { ClientsModule } from '../clients/clients.module';
import { SuppliersModule } from '../suppliers/suppliers.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    ConfigModule,
    ClientsModule,
    SuppliersModule,
    UsersModule,
  ],
  providers: [InitializationService],
  exports: [InitializationService],
})
export class InitializationModule {}