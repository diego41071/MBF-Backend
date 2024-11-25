/* eslint-disable prettier/prettier */
import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
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
      role,
    } = body;

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
      const user = await this.usersService.create(
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
      return { message: 'User registered successfully', user };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('login')
  async login(@Body() body: { username: string; password: string }) {
    const { username, password } = body;
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
}
