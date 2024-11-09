/* eslint-disable prettier/prettier */
import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as crypto from 'crypto';
import { MailerService } from '../mailer/mailer.service'; // Importa MailerService
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService, // Inyecta MailerService
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

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new BadRequestException('Email no encontrado');

    // Generar el token y establecer la fecha de expiración
    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hora
    await user.save();

    // Enviar el correo electrónico con el token
    await this.mailerService.sendResetPasswordEmail(email, token);

    return { message: 'Correo de restablecimiento enviado' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.usersService.findByResetToken(token);
    if (!user || user.resetPasswordExpires.getTime() < Date.now()) {
      throw new BadRequestException('Token inválido o expirado');
    }

    user.password = await bcrypt.hash(newPassword, 10); // Asegúrate de hacer hashing
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await user.save();
    return { message: 'Contraseña actualizada' };
  }
}
