import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as dotenv from 'dotenv';
import { Cron } from '@nestjs/schedule';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as nodemailer from 'nodemailer';
import { ImapService } from 'src/common/services/imap.service';
import { simpleParser } from 'mailparser';

dotenv.config();

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private processedMessageIdsFilePath = path.join(__dirname, 'processedMessageIds.json');
  private processedMessageIds: Set<string> = new Set();

  constructor(private readonly imapService: ImapService) {
    this.loadProcessedMessageIds();
  }

  @Cron('*/20 * * * *')
  public async checkEmails() {
    const client = this.imapService.getClient('EMAIL_USER1');

    if (!client) {
      this.logger.error('IMAP client not available.');
      return;
    }

    client.openBox('INBOX', true, (err, box) => {
      if (err) {
        this.logger.error('Error opening inbox:', err.message);
        return;
      }

      this.logger.log('Checking for new emails...');
      
      client.search(['UNSEEN'], async (err, results) => {
        if (err) {
          this.logger.error('Error searching emails:', err.message);
          return;
        }

        if (!results || results.length === 0) {
          this.logger.log('No new emails found.');
          return;
        }

        const fetch = client.fetch(results, { bodies: '' });
        fetch.on('message', (msg, seqno) => {
          msg.on('body', async (stream) => {
            const parsed = await simpleParser(stream);
            const messageId = parsed.messageId;

            if (this.processedMessageIds.has(messageId)) {
              this.logger.log(`Email with ID ${messageId} has already been processed. Skipping.`);
              return;
            }

            // Extraindo o email do remetente diretamente dos headers
            const emailAddress = parsed.from?.value[0].address; // Capturando o email do remetente de forma mais direta
            const emailBody = parsed.text || '';

            if (emailAddress) {
              this.logger.log(`Email found in message headers: ${emailAddress}`);
              const chatGPTResponse = await this.sendMessageToChatGPT(emailBody);
              await this.sendResponseToEmail(chatGPTResponse, emailAddress);

              this.logger.log(`Email sent to ${emailAddress}.`);
              this.processedMessageIds.add(messageId);
              this.saveProcessedMessageIds();
            } else {
              this.logger.warn('No email address found in the message headers.');
            }
          });
        });

        fetch.once('error', (err) => {
          this.logger.error('Fetch error:', err.message);
        });

        fetch.once('end', () => {
          this.logger.log('Done fetching all messages.');
        });
      });
    });
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
    return response.data.choices[0].message.content;
  }

  private async sendResponseToEmail(chatGPTResponse: string, emailAddress: string): Promise<void> {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT, 10),
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const htmlContent = `
<h1>Dev Felipe Belmont</h1>
<p>${chatGPTResponse}</p>
<p>Att,</p>
<p>Felipe Belmont</p>
<p>contact@efelipebelmont.com</p>
<p>+55 21 98373-5922</p> 

<div>
    <a href="https://www.facebook.com/belmontfelipe/" style="color: #000; text-decoration: none;">
        <img src="cid:facebook" alt="Facebook" style="width: 40px; height: 40px;">
    </a>
    <a href="https://www.instagram.com/eubellmont/" style="color: #000; text-decoration: none;">
        <img src="cid:instagram" alt="Instagram" style="width: 40px; height: 40px;">
    </a>
    <a href="https://www.instagram.com/eubellmont/" style="color: #000; text-decoration: none;">
        <img src="cid:youtube" alt="YouTube" style="width: 40px; height: 40px;">
    </a>
    <a href="https://www.instagram.com/eubellmont/" style="color: #000; text-decoration: none;">
        <img src="cid:twitter" alt="Twitter" style="width: 40px; height: 40px;">
    </a>
    <a href="https://www.linkedin.com/in/belmontprogramador/" style="color: #000; text-decoration: none;">
        <img src="cid:linkedin" alt="LinkedIn" style="width: 40px; height: 40px;">
    </a>
    <a href="https://t.me/bigboss_trader01" style="color: #000; text-decoration: none;">
        <img src="cid:telegram" alt="Telegram" style="width: 40px; height: 40px;">
    </a>
</div>
<img src="cid:logo" alt="logo" style="width: 100%;">
`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: emailAddress,
      subject: 'Support BTX Broker',
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
      this.logger.log(`Email successfully sent to ${emailAddress}: ${info.response}`);
    } catch (error) {
      this.logger.error('Error sending email:', error);
    }
  }

  private loadProcessedMessageIds(): void {
    try {
      const data = fs.readFileSync(this.processedMessageIdsFilePath, 'utf8');
      const ids = JSON.parse(data);
      this.processedMessageIds = new Set(ids);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        this.logger.error('Error loading processed message IDs:', error.message);
      }
    }
  }

  private saveProcessedMessageIds(): void {
    try {
      const ids = Array.from(this.processedMessageIds);
      fs.writeFileSync(this.processedMessageIdsFilePath, JSON.stringify(ids));
    } catch (error) {
      this.logger.error('Error saving processed message IDs:', error.message);
    }
  }
}
