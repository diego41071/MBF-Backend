/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
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

    const saltRounds = 10; // Define la cantidad de rondas de sal
    const hashedPassword = await bcrypt.hash(password, saltRounds); // Asegúrate de pasar saltRounds

    const newUser = new this.userModel({ username, password: hashedPassword });
    return newUser.save();
  }

  async findOne(username: string): Promise<User | undefined> {
    return this.userModel.findOne({ username });
  }
}
