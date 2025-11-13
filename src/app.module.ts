import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
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
import { SharedModule } from './shared/shared.module'; // Novo módulo compartilhado
import { ClientMiddleware } from './clients/middleware/client.middleware';
import config from './config/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config],
    }),
    SharedModule, // Adicione primeiro - será global
    DatabaseModule,
    UsersModule,
    AuthModule,
    ClientsModule,
    ProductsModule,
    SuppliersModule,
    EventsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ClientMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
