import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { Client } from './entities/client.entity';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  controllers: [ClientsController],
  providers: [ClientsService],
  imports: [
    TypeOrmModule.forFeature([Client]),
    forwardRef(() => AuthModule),
  ],
  exports: [ClientsService],
})
export class ClientsModule {}
