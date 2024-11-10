/* eslint-disable prettier/prettier */
import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { MailerService } from '../mailer/mailer.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
  ) {}

  async login(
    username: string,
    password: string,
  ): Promise<{ access_token: string }> {
    const user = await this.usersService.validateUser(username, password);
    if (!user) {
      throw new Error('Invalid credentials');
    }
    const payload = { username: user.username, sub: user._id };
    return { access_token: this.jwtService.sign(payload) };
  }

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  }

  async sendRecoveryCode(username: string) {
    const user = await this.usersService.findByEmail(username);
    if (!user) throw new Error('Usuario no encontrado');

    const code = Math.floor(100000 + Math.random() * 900000); // Código de 6 dígitos
    const expiration = new Date(Date.now() + 15 * 60 * 1000); // Expira en 15 minutos

    // Guardar el código y la expiración en el usuario
    user.resetPasswordCode = code;
    user.resetPasswordExpires = expiration;
    await this.usersService.updateUser(user);

    // Enviar el código por correo electrónico
    await this.mailerService.sendMail(
      username,
      'Código de recuperación de contraseña',
      `Tu código de recuperación es: ${code}`,
    );

    return { message: 'Código enviado al correo electrónico' };
  }

  async resetPassword(username: string, code: number, newPassword: string) {
    const user = await this.usersService.findByEmail(username);

    if (!user) {
      return {
        success: false,
        message: 'Usuario no encontrado',
        errorCode: 'USER_NOT_FOUND',
      };
    }

    if (user.resetPasswordCode !== code) {
      return {
        success: false,
        message: 'Código de recuperación incorrecto',
        errorCode: 'INVALID_RECOVERY_CODE',
      };
    }

    if (user.resetPasswordExpires < new Date()) {
      return {
        success: false,
        message: 'El código de recuperación ha expirado',
        errorCode: 'RECOVERY_CODE_EXPIRED',
      };
    }

    // Cambiar la contraseña y limpiar campos
    user.password = await this.hashPassword(newPassword);
    user.resetPasswordCode = null;
    user.resetPasswordExpires = null;
    await this.usersService.updateUser(user);

    return { success: true, message: 'Contraseña cambiada exitosamente' };
  }
}
