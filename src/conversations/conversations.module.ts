import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationsService } from './conversations.service';
import { ConversationsController } from './conversations.controller';
import { Conversation } from '../database/entities/conversation.entity';
import { SlackUser } from '../database/entities/slack-user.entity';
import { Tenant } from '../database/entities/tenant.entity';
import { OrganizationMember } from '../database/entities/organization-member.entity';
import { AuthModule } from '../auth/auth.module';
import { SlackModule } from '../slack/slack.module';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, SlackUser, Tenant, OrganizationMember]), AuthModule, SlackModule],
  controllers: [ConversationsController],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
