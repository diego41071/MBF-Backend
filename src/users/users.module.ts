import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UserSchema } from './user.schema'; // Asegúrate de importar el esquema

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]), // Registra el modelo aquí
  ],
  providers: [UsersService],
  controllers: [UsersController],
})
export class UsersModule {}
