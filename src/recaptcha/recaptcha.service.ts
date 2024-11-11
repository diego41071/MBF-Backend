/* eslint-disable prettier/prettier */
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class RecaptchaService {
  constructor(private httpService: HttpService) {}

  async validateCaptcha(captchaToken: string): Promise<boolean> {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    const response = await firstValueFrom(
      this.httpService.post(
        `https://www.google.com/recaptcha/api/siteverify`,
        null,
        {
          params: {
            secret: secretKey,
            response: captchaToken,
          },
        },
      ),
    );
    return response.data.success;
  }
}
