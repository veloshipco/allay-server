import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { SlackModule } from './slack/slack.module';
import { ConversationsModule } from './conversations/conversations.module';
import { OrganizationModule } from './organization/organization.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    DatabaseModule,
    AuthModule,
    TenantsModule,
    SlackModule,
    ConversationsModule,
    OrganizationModule,
  ],
})
export class AppModule {}
