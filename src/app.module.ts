import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ClientsModule } from './clients/clients.module';
import { ProductsModule } from './products/products.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { EventsModule } from './events/events.module';
import config from './config/config';
import { InitializationModule } from './initialization/initialization.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config],
    }),
    DatabaseModule,
    UsersModule,
    AuthModule,
    ClientsModule,
    ProductsModule,
    SuppliersModule,
    EventsModule,
    InitializationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

