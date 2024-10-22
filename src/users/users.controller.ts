/* eslint-disable prettier/prettier */
import { Controller, Post, Body, Req, Res } from '@nestjs/common';
import { UsersService } from './users.service';
import * as bcrypt from 'bcrypt';

@Controller('auth')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  async register(
    @Body('username') username: string,
    @Body('password') password: string,
  ) {
    if (!username || !password) {
      throw new Error('Username and password are required'); // Para depurar
    }
    return this.usersService.create(username, password);
  }

  @Post('login')
  async login(
    @Body('username') username: string,
    @Body('password') password: string,
  ) {
    const user = await this.usersService.findOne(username);
    if (user && (await bcrypt.compare(password, user.password))) {
      // Aquí puedes generar un token JWT si lo necesitas
      return { message: 'Login successful' };
    }
    return { message: 'Invalid credentials' };
  }

  @Post('logout')
  async logout(@Req() req, @Res() res) {
    // Aquí puedes invalidar el token del lado del servidor, si es necesario.
    // Si usas JWT, simplemente elimina el token del lado del cliente.
    res.clearCookie('auth'); // Si usas cookies, por ejemplo
    return res.send({ message: 'Logout successful' });
  }
}
