import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { Email2Service } from './email2.service';
import { Email2Controller } from './email2.controller';

@Module({
  controllers: [Email2Controller],
  providers: [Email2Service],
})
export class Email2Module {}
