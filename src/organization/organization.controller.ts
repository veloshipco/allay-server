import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  BadRequestException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import { OrganizationService, OrganizationMemberInfo, InvitationInfo } from './organization.service';
import { OrganizationRole, OrganizationPermission } from '../database/types';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';

@Controller(':tenantId/organization')
@UseGuards(AuthGuard, TenantGuard, PermissionsGuard)
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Get('members')
  @Permissions(OrganizationPermission.MANAGE_MEMBERS, OrganizationPermission.VIEW_ANALYTICS)
  async getMembers(@Param('tenantId') tenantId: string): Promise<{ members: OrganizationMemberInfo[] }> {
    try {
      const members = await this.organizationService.getOrganizationMembers(tenantId);
      return { members };
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch organization members');
    }
  }

  @Post('members')
  @Permissions(OrganizationPermission.MANAGE_MEMBERS)
  async addMember(
    @Param('tenantId') tenantId: string,
    @Body() body: {
      userId: string;
      role: OrganizationRole;
      customPermissions?: OrganizationPermission[];
    },
  ) {
    const { userId, role, customPermissions } = body;

    if (!userId || !role) {
      throw new BadRequestException('userId and role are required');
    }

    if (!Object.values(OrganizationRole).includes(role)) {
      throw new BadRequestException('Invalid role');
    }

    try {
      const result = await this.organizationService.addMemberToOrganization(
        userId,
        tenantId,
        role,
        customPermissions
      );

      if (!result.success) {
        throw new BadRequestException(result.error);
      }

      return {
        success: true,
        member: {
          id: result.member!.id,
          userId: result.member!.userId,
          role: result.member!.role,
          permissions: result.member!.permissions,
          joinedAt: result.member!.joinedAt,
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to add organization member');
    }
  }

  @Get('invitations')
  @Permissions(OrganizationPermission.MANAGE_MEMBERS, OrganizationPermission.INVITE_MEMBERS)
  async getInvitations(@Param('tenantId') tenantId: string): Promise<{ invitations: InvitationInfo[] }> {
    try {
      const invitations = await this.organizationService.getOrganizationInvitations(tenantId);
      return { invitations };
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch organization invitations');
    }
  }

  @Post('invitations')
  @Permissions(OrganizationPermission.INVITE_MEMBERS)
  async createInvitation(
    @Param('tenantId') tenantId: string,
    @Body() body: {
      email: string;
      proposedRole?: OrganizationRole;
      proposedPermissions?: OrganizationPermission[];
      message?: string;
      expiresInDays?: number;
    },
  ) {
    const { email, proposedRole, proposedPermissions, message, expiresInDays } = body;

    if (!email) {
      throw new BadRequestException('Email is required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('Invalid email format');
    }

    const role = proposedRole || OrganizationRole.MEMBER;
    if (!Object.values(OrganizationRole).includes(role)) {
      throw new BadRequestException('Invalid role');
    }

    try {
      const result = await this.organizationService.createInvitation(
        email,
        tenantId,
        '', // invitedBy should come from authenticated user
        role,
        proposedPermissions,
        message,
        expiresInDays || 7
      );

      if (!result.success) {
        throw new BadRequestException(result.error);
      }

      return {
        success: true,
        invitation: {
          id: result.invitation!.id,
          email: result.invitation!.email,
          proposedRole: result.invitation!.proposedRole,
          proposedPermissions: result.invitation!.proposedPermissions,
          token: result.invitation!.token,
          expiresAt: result.invitation!.expiresAt,
          createdAt: result.invitation!.createdAt,
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create organization invitation');
    }
  }

  @Get('slack/members-not-in-slack')
  @Permissions(OrganizationPermission.MANAGE_MEMBERS, OrganizationPermission.MANAGE_SLACK)
  async getMembersNotInSlack(@Param('tenantId') tenantId: string) {
    try {
      const result = await this.organizationService.getOrganizationMembersNotInSlack(tenantId);
      return result;
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch members not in Slack');
    }
  }
}