import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import { SlackService } from "./slack.service";
import { SlackController } from "./slack.controller";
import { Tenant } from "../database/entities/tenant.entity";
import { Conversation } from "../database/entities/conversation.entity";
import { SlackUser } from "../database/entities/slack-user.entity";
import { OrganizationMember } from "../database/entities/organization-member.entity";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tenant,
      Conversation,
      SlackUser,
      OrganizationMember,
    ]),
    ConfigModule,
    AuthModule,
  ],
  controllers: [SlackController],
  providers: [SlackService],
  exports: [SlackService],
})
export class SlackModule {}
