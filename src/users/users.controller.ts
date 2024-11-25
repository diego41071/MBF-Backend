/* eslint-disable prettier/prettier */
import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  HttpException,
  HttpStatus,
  Get,
  Delete,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthService } from '../auth/auth.service'; // Asegúrate de importar el servicio de autenticación
import * as bcrypt from 'bcrypt';
import { RecaptchaService } from 'src/recaptcha/recaptcha.service';

@Controller('auth')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService, // Inyecta el servicio de autenticación
    private recaptchaService: RecaptchaService,
  ) {}

  @Post('register')
  async register(
    @Body()
    body: {
      name: string;
      lastname: string;
      company: string;
      doc: string;
      position: string;
      username: string;
      password: string;
      confirmPassword: string;
      check: number;
      captchaToken: string;
      role: string;
    },
  ) {
    const {
      name,
      lastname,
      company,
      doc,
      position,
      username,
      password,
      confirmPassword,
      check,
      captchaToken,
      role,
    } = body;

    const isCaptchaValid =
      await this.recaptchaService.validateCaptcha(captchaToken);
    if (!isCaptchaValid) {
      throw new BadRequestException('reCAPTCHA falló, intenta nuevamente.');
    }

    if (
      !name ||
      !lastname ||
      !company ||
      !doc ||
      !position ||
      !username ||
      !password ||
      !confirmPassword ||
      !check ||
      !captchaToken ||
      !role
    ) {
      throw new HttpException(
        'All fields are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (password !== confirmPassword) {
      throw new HttpException('Passwords do not match', HttpStatus.BAD_REQUEST);
    }

    try {
      return await this.usersService.create(
        name,
        lastname,
        company,
        doc,
        position,
        username,
        password,
        confirmPassword,
        check,
        role,
      );
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('login')
  async login(
    @Body('username') username: string,
    @Body('password') password: string,
    @Body('captchaToken ') captchaToken: string,
  ) {
    const isCaptchaValid =
      await this.recaptchaService.validateCaptcha(captchaToken);
    if (!isCaptchaValid) {
      throw new BadRequestException('Invalid reCAPTCHA');
    }
    const user = await this.usersService.findOne(username);
    if (user && (await bcrypt.compare(password, user.password))) {
      const { access_token, role } = await this.authService.login(
        username,
        password,
      ); // Obtén el token y el rol desde el servicio
      return {
        message: 'Login successful',
        access_token,
        role, // Incluye el rol en la respuesta
      };
    }
    throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
  }

  @Post('logout')
  async logout(@Req() req, @Res() res) {
    res.clearCookie('auth');
    return res.send({ message: 'Logout successful' });
  }

  @Get('users')
  async getAllUsers() {
    return await this.usersService.findAll();
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    await this.usersService.deleteUser(id);
    return { message: `User with ID ${id} deleted successfully` };
  }

  @Post('forgot-password')
  async forgotPassword(@Body('username') username: string) {
    return await this.authService.sendRecoveryCode(username);
  }

  @Post('reset-password')
  async resetPassword(
    @Body('code') code: number, // Cambia 'token' por 'code'
    @Body('username') username: string, // Añade email para identificar al usuario
    @Body('newPassword') newPassword: string,
  ) {
    return await this.authService.resetPassword(username, code, newPassword);
  }

  @Post('google')
  async googleLogin(@Body('idToken') idToken: string) {
    return this.authService.verifyGoogleToken(idToken);
  }
}
