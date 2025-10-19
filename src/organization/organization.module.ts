import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationService } from './organization.service';
import { OrganizationController } from './organization.controller';
import { OrganizationMember } from '../database/entities/organization-member.entity';
import { OrganizationInvitation } from '../database/entities/organization-invitation.entity';
import { User } from '../database/entities/user.entity';
import { SlackUser } from '../database/entities/slack-user.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrganizationMember,
      OrganizationInvitation,
      User,
      SlackUser,
    ]),
    AuthModule,
  ],
  controllers: [OrganizationController],
  providers: [OrganizationService],
  exports: [OrganizationService],
})
export class OrganizationModule {}