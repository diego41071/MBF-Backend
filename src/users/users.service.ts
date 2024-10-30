/* eslint-disable prettier/prettier */
import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User } from './user.schema'; // Asegúrate de que esta ruta sea correcta

@Injectable()
export class UsersService {
  constructor(@InjectModel('User') private userModel: Model<User>) {}

  async findOne(username: string): Promise<User | null> {
    return this.userModel.findOne({ username });
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find().select('-password').exec(); // Excluye el campo 'password'
  }

  async deleteUser(id: string): Promise<void> {
    const result = await this.userModel.deleteOne({ _id: id });
    if (result.deletedCount === 0) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.findOne(username);
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user.toObject(); // Excluye la contraseña
      return result;
    }
    return null; // Retorna null si las credenciales son inválidas
  }

  async create(
    name: string,
    lastname: string,
    company: string,
    doc: string,
    position: string,
    username: string,
    password: string,
    confirmPassword: string,
    check: number,
  ): Promise<User> {
    const existingUser = await this.findOne(username);
    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const newUser = new this.userModel({
      name,
      lastname,
      company,
      doc,
      position,
      username,
      password: hashedPassword,
      confirmPassword: hashedPassword,
      check,
    });
    return newUser.save();
  }
}
