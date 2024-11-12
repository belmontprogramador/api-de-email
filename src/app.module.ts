import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EmailService } from './email/email.service';
import { ImapService } from './common/services/imap.service';
import { Email2Module } from './email2/email2.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    Email2Module, // Importando o módulo de agendamento
  ],
  controllers: [AppController], // Controladores da aplicação
  providers: [
    AppService,        // Serviço principal da aplicação
    EmailService,      // Serviço de e-mails
    ImapService,       // Serviço IMAP compartilhado entre os serviços de e-mail
  ],
})
export class AppModule {}
