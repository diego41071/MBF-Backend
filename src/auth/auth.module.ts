/* eslint-disable prettier/prettier */
import { Module, forwardRef } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    JwtModule.register({
      secret: 'secretKey', // Cambia esto a tu clave secreta
      signOptions: { expiresIn: '60s' },
    }),
    forwardRef(() => UsersModule), // Usa forwardRef aquí para evitar ciclos de dependencia
  ],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
