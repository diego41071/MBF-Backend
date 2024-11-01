/* eslint-disable prettier/prettier */
import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(
    username: string,
    password: string,
  ): Promise<{ access_token: string }> {
    const user = await this.usersService.validateUser(username, password); // Llama a validateUser con ambos parámetros
    if (!user) {
      throw new Error('Invalid credentials');
    }
    const payload = { username: user.username, sub: user._id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async forgotPassword(username: string) {
    const user = await this.usersService.findByEmail(username);
    if (!user) throw new BadRequestException('Email no encontrado');

    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hora de expiración
    // 1 hora de expiración

    await user.save();
    // Aquí podrías enviar el token al correo electrónico del usuario

    return { message: 'Correo enviado para recuperación de contraseña' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.usersService.findByResetToken(token);
    if (!user || user.resetPasswordExpires.getTime() < Date.now()) {
      throw new BadRequestException('Token inválido o expirado');
    }

    user.password = newPassword; // Asegúrate de hacer hashing
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await user.save();
    return { message: 'Contraseña actualizada' };
  }
}
