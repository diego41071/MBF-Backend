/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
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

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  }

  async resetPassword(email: string, newPassword: string) {
    const user = await this.usersService.findByEmail(email);
    user.password = await this.hashPassword(newPassword);
    user.resetPasswordCode = null; // Eliminar el código usado
    user.resetPasswordExpires = null; // Eliminar la expiración
    await this.usersService.updateUser(user);
    return { message: 'Contraseña cambiada exitosamente' };
  }

  async sendRecoveryCode(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new Error('Usuario no encontrado');

    const code = Math.floor(100000 + Math.random() * 900000); // Código de 6 dígitos
    const expiration = new Date(Date.now() + 15 * 60 * 1000); // Expira en 15 minutos

    // Guardar el código y la expiración en el usuario
    user.resetPasswordCode = code;
    user.resetPasswordExpires = expiration;
    await this.usersService.updateUser(user); // Usa el nuevo método `updateUser`

    // Enviar el código por correo electrónico
    await this.mailerService.sendMail(
      email,
      'Código de recuperación de contraseña',
      `Tu código de recuperación es: ${code}`,
    );

    return { message: 'Código enviado al correo electrónico' };
  }

  async verifyRecoveryCode(email: string, code: number) {
    const user = await this.usersService.findByEmail(email);
    if (!user || user.resetPasswordCode !== code) {
      throw new Error('Código inválido o expirado');
    }

    // Verificar que el código no esté expirado
    if (user.resetPasswordExpires < new Date()) {
      throw new Error('El código ha expirado');
    }

    // Permitir el cambio de contraseña
    return { message: 'Código verificado' };
  }
}
