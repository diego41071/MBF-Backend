/* eslint-disable prettier/prettier */
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { MailerService } from '../mailer/mailer.service';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
  ) {}

  private client = new OAuth2Client(
    '143084504266-m64qjq4oio23hrpc55s0qs86fq84o7sq.apps.googleusercontent.com',
  );

  async verifyGoogleToken(idToken: string) {
    const ticket = await this.client.verifyIdToken({
      idToken,
      audience: 'TU_CLIENT_ID',
    });
    const payload = ticket.getPayload();

    if (!payload) {
      throw new UnauthorizedException('Token de Google no válido');
    }

    // Extrae la información del usuario desde el payload de Google
    const { sub, email, name, picture } = payload;
    // Verifica si el usuario existe en la base de datos, o crea un nuevo registro
    // Aquí puedes continuar con tu lógica de autenticación o creación de usuario

    return {
      userId: sub,
      email,
      name,
      picture,
    };
  }

  async login(
    username: string,
    password: string,
  ): Promise<{ access_token: string; role: string }> {
    const user = await this.usersService.validateUser(username, password);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const payload = { username: user.username, sub: user._id, role: user.role }; // Incluye el rol en el payload
    const accessToken = this.jwtService.sign(payload);

    return {
      access_token: accessToken,
      role: user.role, // Devuelve el rol junto con el token
    };
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
