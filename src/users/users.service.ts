/* eslint-disable prettier/prettier */
import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './user.schema';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(@InjectModel('User') private userModel: Model<User>) {}

  async create(username: string, password: string): Promise<User> {
    if (!password) {
      throw new Error('Password is required'); // Para depurar
    }

    // Verifica si el usuario ya existe
    const existingUser = await this.userModel.findOne({ username });
    if (existingUser) {
      throw new HttpException('Username already exists', HttpStatus.CONFLICT);
    }

    const saltRounds = 10; // Define la cantidad de rondas de sal
    const hashedPassword = await bcrypt.hash(password, saltRounds); // Asegúrate de pasar saltRounds

    const newUser = new this.userModel({ username, password: hashedPassword });
    return newUser.save();
  }

  async deleteUser(id: string): Promise<void> {
    const result = await this.userModel.deleteOne({ _id: id });
    if (result.deletedCount === 0) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }

  async findOne(username: string): Promise<User | undefined> {
    return this.userModel.findOne({ username });
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find().select('-password').exec(); // Excluye el campo 'password'
  }
}
