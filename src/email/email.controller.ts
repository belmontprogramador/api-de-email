import { Controller, Get, Post, Body, Res } from '@nestjs/common';
import { Response } from 'express';
import { EmailService } from './email.service';

@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Get('latest-email')
  async getLatestEmail(@Res() res: Response) {
    try {
      await this.emailService.checkEmails();  // Ajustado para usar checkEmails
      res.status(200).json({ success: true, message: 'Emails processed and responses sent.' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  @Post('webhook')
  async handleWebhook(@Body() body, @Res() res: Response) {
    try {
      await this.emailService.checkEmails();  // Ajustado para usar checkEmails
      res.status(200).send('OK');
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
