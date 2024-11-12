import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as Imap from 'node-imap';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class ImapService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ImapService.name);
  private clients: { [key: string]: Imap } = {};

  async onModuleInit() {
    await this.connect('EMAIL_USER1', process.env.EMAIL_USER, process.env.EMAIL_PASSWORD);
    await this.connect('EMAIL_USER2', process.env.EMAIL_USER2, process.env.EMAIL_PASSWORD2);
  }

  private connect(key: string, user: string, pass: string) {
    const client = new Imap({
      user,
      password: pass,
      host: process.env.IMAP_HOST || 'imap.hostinger.com',
      port: parseInt(process.env.IMAP_PORT, 10) || 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
    });

    client.once('ready', () => {
      this.logger.log(`Connected to email server for ${key}.`);
      this.openInbox(client, key);
    });

    client.once('error', (err) => {
      this.logger.error(`Error with IMAP connection for ${key}: ${err.message}`);
      this.scheduleReconnect(key, user, pass);
    });

    client.once('end', () => {
      this.logger.warn(`IMAP connection ended for ${key}. Scheduling reconnect...`);
      this.scheduleReconnect(key, user, pass);
    });

    client.connect();
    this.clients[key] = client;
  }

  private openInbox(client: Imap, key: string) {
    client.openBox('INBOX', true, (err, box) => {
      if (err) {
        this.logger.error(`Error opening inbox for ${key}: ${err.message}`);
        return;
      }
      this.logger.log(`Inbox opened for ${key}. Total messages: ${box.messages.total}`);
    });
  }

  private scheduleReconnect(key: string, user: string, pass: string) {
    this.logger.log(`Scheduling reconnect for ${key}...`);
    setTimeout(() => this.connect(key, user, pass), 10000);
  }

  public getClient(key: string): Imap {
    return this.clients[key];
  }

  async onModuleDestroy() {
    for (const key in this.clients) {
      if (this.clients[key]) {
        this.clients[key].end();
      }
    }
  }
}
