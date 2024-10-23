import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UserSchema } from './user.schema';
import { AuthModule } from '../auth/auth.module'; // Importa AuthModule

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]),
    forwardRef(() => AuthModule), // Usa forwardRef aquí si es necesario
  ],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService], // Exporta UsersService
})
export class UsersModule {}
