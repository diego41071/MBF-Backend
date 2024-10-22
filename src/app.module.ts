/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from './users/users.module'; // Asegúrate de tener un módulo de usuarios
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [MongooseModule.forRoot('mongodb+srv://alexanderdiego2007:diegonacional123@cluster0.lnrft.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'),
    UsersModule,],
  controllers: [AppController],
  providers: [AppService],

})
export class AppModule { }
