/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { RecaptchaService } from './recaptcha.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule], // Asegúrate de que HttpModule está importado si lo necesitas
  providers: [RecaptchaService], // Asegúrate de que RecaptchaService esté aquí
  exports: [RecaptchaService], // Exporta RecaptchaService para que otros módulos lo puedan usar
})
export class RecaptchaModule {}
