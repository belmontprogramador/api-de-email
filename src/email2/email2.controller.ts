import { Controller, Post, Body } from '@nestjs/common';
import { Email2Service } from './email2.service';

@Controller('email2')
export class Email2Controller {
  constructor(private readonly email2Service: Email2Service) {}

  // Endpoint para receber a requisição POST e enviar o e-mail
  @Post('send-custom-email')
  async sendCustomEmail(@Body() body: { to: string; subject: string; message: string }) {
    const { to, subject, message } = body;

    // Chama o método que processa a requisição e envia o e-mail
    await this.email2Service.sendEmailOnRequest(to, subject, message);
    
    // Retorna uma resposta de sucesso
    return { status: 'Email enviado com sucesso' };
  }
}
