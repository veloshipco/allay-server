import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { User } from "./entities/user.entity";
import { Tenant } from "./entities/tenant.entity";
import { Conversation } from "./entities/conversation.entity";
import { SlackUser } from "./entities/slack-user.entity";
import { OrganizationMember } from "./entities/organization-member.entity";
import { OrganizationInvitation } from "./entities/organization-invitation.entity";
import { Session } from "./entities/session.entity";

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: "postgres",
        host: configService.get("DATABASE_HOST", "localhost"),
        port: +configService.get("DATABASE_PORT", "5432"),
        username: configService.get("DATABASE_USERNAME", "postgres"),
        password: configService.get("DATABASE_PASSWORD", ""),
        database: configService.get("DATABASE_NAME", "postgres"),
        ssl: configService.get("DATABASE_HOST")?.includes("supabase.co")
          ? { rejectUnauthorized: false }
          : configService.get("DATABASE_SSL", false),
        entities: [
          User,
          Tenant,
          Conversation,
          SlackUser,
          OrganizationMember,
          OrganizationInvitation,
          Session,
        ],
        synchronize: configService.get("NODE_ENV") === "development",
        logging: configService.get("NODE_ENV") === "development",
        migrationsRun: false,
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([
      User,
      Tenant,
      Conversation,
      SlackUser,
      OrganizationMember,
      OrganizationInvitation,
      Session,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
