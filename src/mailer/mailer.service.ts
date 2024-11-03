/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
  private transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
      secure: false, // Usa TLS en lugar de SSL
    });
  }

  async sendResetPasswordEmail(to: string, token: string) {
    const resetLink = `https://tudominio.com/reset-password?token=${token}`;

    const mailOptions = {
      from: this.configService.get<string>('SMTP_USER'),
      to,
      subject: 'Restablecimiento de contraseña',
      text: `Para restablecer tu contraseña, haz clic en el siguiente enlace: ${resetLink}`,
      html: `<p>Para restablecer tu contraseña, haz clic en el siguiente enlace:</p><a href="${resetLink}">${resetLink}</a>`,
    };

    await this.transporter.sendMail(mailOptions);
  }
}
