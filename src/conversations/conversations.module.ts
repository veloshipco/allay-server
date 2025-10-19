import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Conversation } from "../database/entities/conversation.entity";
import { SlackUser } from "../database/entities/slack-user.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, SlackUser])],
})
export class ConversationsModule {}
