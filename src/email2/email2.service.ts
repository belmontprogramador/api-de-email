import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

@Injectable()
export class Email2Service {
  private readonly logger = new Logger(Email2Service.name);

  // Função principal para processar a requisição e enviar o e-mail
  public async sendEmailOnRequest(to: string, subject: string, message: string): Promise<void> {
    this.logger.log(`Processing request to send email to ${to}`);

    // Envia a mensagem para o ChatGPT para processar o conteúdo
    const chatGPTResponse = await this.sendMessageToChatGPT(message);

    // Envia o e-mail com o conteúdo gerado pelo ChatGPT
    await this.sendCustomEmail(to, subject, chatGPTResponse);
  }

  private async sendCustomEmail(to: string, subject: string, message: string): Promise<void> {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT, 10),
      secure: true,
      auth: {
        user: process.env.EMAIL_USER, // De onde os e-mails vão ser enviados (ex: contato@felipebelmont.com)
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const htmlContent = `
      <h1>Dev Felipe Belmont</h1>
      <p>${message}</p> <!-- Aqui vai a resposta processada do ChatGPT -->
      <p>Att,</p>
      <p>Felipe Belmont</p>
      <p>contact@efelipebelmont.com</p>
      <p>+55 21 98373-5922</p>
      <div>
        <a href="https://www.facebook.com/belmontfelipe/" style="color: #000; text-decoration: none;">
            <img src="cid:facebook" alt="Facebook" style="width: 40px; height: 40px;">
        </a>
        <!-- Outras redes sociais -->
      </div>
      <img src="cid:logo" alt="logo" style="width: 100%;">
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER, // 'contato@felipebelmont.com'
      to,
      subject,
      html: htmlContent,
      attachments: [
        { filename: 'assinatura.png', path: path.resolve(process.env.IMAGE_LOGO), cid: 'logo' },
        { filename: 'facebook.png', path: path.resolve(process.env.IMAGE_FACEBOOK), cid: 'facebook' },
        { filename: 'instagram.png', path: path.resolve(process.env.IMAGE_INSTAGRAM), cid: 'instagram' },
        { filename: 'youtube.png', path: path.resolve(process.env.IMAGE_YOUTUBE), cid: 'youtube' },
        { filename: 'twitter.png', path: path.resolve(process.env.IMAGE_TWITTER), cid: 'twitter' },
        { filename: 'linkedin.png', path: path.resolve(process.env.IMAGE_LINKEDIN), cid: 'linkedin' },
        { filename: 'telegram.png', path: path.resolve(process.env.IMAGE_TELEGRAM), cid: 'telegram' },
      ],
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      this.logger.log(`Custom email successfully sent to ${to}: ${info.response}`);
    } catch (error) {
      this.logger.error('Error sending custom email:', error.message);
      throw error;
    }
  }

  private async sendMessageToChatGPT(emailBody: string): Promise<string> {
    const data = {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content:
            "Você é Turbo Max, o assistente virtual de Felipe Belmont, desenvolvedor. Sua função é agendar reuniões para Felipe e responder dúvidas sobre web design, programação em JavaScript, especialmente frontend com React e backend com Node.js.",
        },
        { role: 'user', content: emailBody },
      ],
    };
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      data,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      },
    );
    return response.data.choices[0].message.content.trim(); // Essa resposta vai para o corpo do e-mail
  }
}
