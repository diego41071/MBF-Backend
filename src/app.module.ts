/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from './users/users.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { MailerService } from './mailer/mailer.service';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { InventoryModule } from './inventory/inventory.module';
import { EquipmentModule } from './equipment/equipment.module';
import { EventsModule } from './events/events.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(
      'mongodb+srv://alexanderdiego2007:diegonacional123@cluster0.lnrft.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0',
    ),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'assets'), // Ruta a la carpeta 'assets'
      serveRoot: '/assets', // Opcional: ruta base en la URL, por ejemplo, http://localhost:3000/assets
    }),
    UsersModule,
    AuthModule,
    HttpModule,
    InventoryModule,
    EquipmentModule,
    EventsModule, // El módulo ya incluye EventsController y EventsService
  ],
  controllers: [AppController], // EventsController se gestiona dentro de EventsModule
  providers: [AppService, MailerService], // EventsService se gestiona dentro de EventsModule
})
export class AppModule {}
