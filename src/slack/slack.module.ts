import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SlackService } from './slack.service';
import { Tenant } from '../database/entities/tenant.entity';
import { Conversation } from '../database/entities/conversation.entity';
import { SlackUser } from '../database/entities/slack-user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant, Conversation, SlackUser])],
  providers: [SlackService],
  exports: [SlackService],
})
export class SlackModule {}