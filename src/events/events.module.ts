import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule, // Importando o AuthModule ao invés do JwtModule
  ],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}
