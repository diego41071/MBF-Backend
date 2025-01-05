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
  Put,
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
      address?: string; // Campo opcional
      phone?: string; // Campo opcional
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
      address, // Nuevo campo
      phone, // Nuevo campo
    } = body;

    // Validación del reCAPTCHA
    const isCaptchaValid =
      await this.recaptchaService.validateCaptcha(captchaToken);
    if (!isCaptchaValid) {
      throw new BadRequestException('reCAPTCHA falló, intenta nuevamente.');
    }

    // Validación de campos obligatorios
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
        'All required fields must be filled',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Validación de contraseñas
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
        address, // Nuevo campo
        phone, // Nuevo campo
      );
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('login')
  async login(
    @Body('username') username: string,
    @Body('password') password: string,
    @Body('captchaToken') captchaToken: string,
  ) {
    const isCaptchaValid =
      await this.recaptchaService.validateCaptcha(captchaToken);
    if (!isCaptchaValid) {
      throw new BadRequestException('Invalid reCAPTCHA');
    }
    const user = await this.usersService.findOne(username);
    if (user && (await bcrypt.compare(password, user.password))) {
      const { access_token, role, name, lastname, address, phone, userId } =
        await this.authService.login(username, password); // Incluye address y phone en el login
      return {
        message: 'Login successful',
        access_token,
        role,
        name,
        email: username,
        lastname,
        address, // Nuevo campo
        phone, // Nuevo campo
        userId,
      };
    }
    throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
  }

  @Get('users')
  async getAllUsers() {
    return await this.usersService.findAll(); // Asegúrate de que estos datos incluyan address y phone
  }

  @Put('users/:id')
  async updateUser(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      lastname?: string;
      company?: string;
      doc?: string;
      position?: string;
      username?: string;
      password?: string;
      role?: string;
      address?: string;
      phone?: string;
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
      role,
      address,
      phone,
    } = body;

    // Validar si hay campos a actualizar
    if (
      !name &&
      !lastname &&
      !company &&
      !doc &&
      !position &&
      !username &&
      !password &&
      !role &&
      !address &&
      !phone
    ) {
      throw new BadRequestException('No fields provided to update');
    }

    // Validación opcional para la contraseña
    let hashedPassword: string | undefined;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    try {
      const updatedUser = await this.usersService.updateUser(id, {
        name,
        lastname,
        company,
        doc,
        position,
        username,
        password: hashedPassword,
        role,
        address,
        phone,
      });

      if (!updatedUser) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      return { message: 'User updated successfully', user: updatedUser };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
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
    @Body('code') code: number,
    @Body('username') username: string,
    @Body('newPassword') newPassword: string,
  ) {
    return await this.authService.resetPassword(username, code, newPassword);
  }

  @Post('google')
  async googleLogin(@Body('idToken') idToken: string) {
    return this.authService.verifyGoogleToken(idToken);
  }
}
