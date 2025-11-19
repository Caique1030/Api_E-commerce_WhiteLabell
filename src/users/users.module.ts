import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { EventsModule } from '../events/events.module';
import { AuthModule } from '../auth/auth.module'; // <-- ADICIONE

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    forwardRef(() => EventsModule),
    forwardRef(() => AuthModule), // <-- ADICIONE
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
