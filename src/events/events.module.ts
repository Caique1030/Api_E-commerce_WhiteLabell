import { Module, forwardRef } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { AuthModule } from 'src/auth/auth.module';
import { ClientsModule } from 'src/clients/clients.module';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => ClientsModule),
  ],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}
