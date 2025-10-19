import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganizationMember } from '../database/entities/organization-member.entity';
import { OrganizationInvitation } from '../database/entities/organization-invitation.entity';
import { User } from '../database/entities/user.entity';
import { SlackUser } from '../database/entities/slack-user.entity';
import { OrganizationRole, OrganizationPermission, InvitationStatus } from '../database/types';
import * as crypto from 'crypto';

interface OrganizationMemberInfo {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: OrganizationRole;
  permissions: OrganizationPermission[];
  joinedAt: Date;
  lastActiveAt: Date;
  isActive: boolean;
}

interface InvitationInfo {
  id: string;
  email: string;
  proposedRole: OrganizationRole;
  proposedPermissions: OrganizationPermission[];
  status: InvitationStatus;
  invitedBy: string;
  invitedByName: string;
  message?: string;
  createdAt: Date;
  expiresAt: Date;
}

// Export interfaces for use in controllers
export type { OrganizationMemberInfo, InvitationInfo };

const DEFAULT_PERMISSIONS = {
  [OrganizationRole.OWNER]: [
    OrganizationPermission.MANAGE_MEMBERS,
    OrganizationPermission.INVITE_MEMBERS,
    OrganizationPermission.MANAGE_SLACK,
    OrganizationPermission.VIEW_ANALYTICS,
    OrganizationPermission.MANAGE_INTEGRATIONS
  ],
  [OrganizationRole.ADMIN]: [
    OrganizationPermission.INVITE_MEMBERS,
    OrganizationPermission.MANAGE_SLACK,
    OrganizationPermission.VIEW_ANALYTICS
  ],
  [OrganizationRole.MEMBER]: [
    OrganizationPermission.VIEW_ANALYTICS
  ]
};

@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);

  constructor(
    @InjectRepository(OrganizationMember)
    private memberRepository: Repository<OrganizationMember>,
    @InjectRepository(OrganizationInvitation)
    private invitationRepository: Repository<OrganizationInvitation>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(SlackUser)
    private slackUserRepository: Repository<SlackUser>,
  ) {}

  async getOrganizationMembers(tenantId: string): Promise<OrganizationMemberInfo[]> {
    try {
      const members = await this.memberRepository.find({
        where: { tenantId, isActive: true },
        relations: ['user'],
        order: { joinedAt: 'ASC' }
      });

      return members.map(member => ({
        id: member.id,
        userId: member.userId,
        email: member.user.email,
        firstName: member.user.firstName,
        lastName: member.user.lastName,
        role: member.role,
        permissions: member.permissions,
        joinedAt: member.joinedAt,
        lastActiveAt: member.lastActiveAt,
        isActive: member.isActive
      }));
    } catch (error) {
      this.logger.error('Error fetching organization members:', error);
      return [];
    }
  }

  async addMemberToOrganization(
    userId: string,
    tenantId: string,
    role: OrganizationRole = OrganizationRole.MEMBER,
    permissions?: OrganizationPermission[]
  ): Promise<{ success: boolean; error?: string; member?: OrganizationMember }> {
    try {
      // Check if user exists
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Check if already a member
      const existingMember = await this.memberRepository.findOne({
        where: { userId, tenantId }
      });

      if (existingMember) {
        if (existingMember.isActive) {
          return { success: false, error: 'User is already a member' };
        } else {
          // Reactivate existing member
          existingMember.isActive = true;
          existingMember.role = role;
          existingMember.permissions = permissions || DEFAULT_PERMISSIONS[role];
          existingMember.lastActiveAt = new Date();

          const updated = await this.memberRepository.save(existingMember);
          return { success: true, member: updated };
        }
      }

      // Create new member
      const member = this.memberRepository.create({
        userId,
        tenantId,
        role,
        permissions: permissions || DEFAULT_PERMISSIONS[role],
        lastActiveAt: new Date()
      });

      const saved = await this.memberRepository.save(member);
      return { success: true, member: saved };
    } catch (error) {
      this.logger.error('Error adding member to organization:', error);
      return { success: false, error: 'Failed to add member' };
    }
  }

  async getMemberPermissions(
    userId: string,
    tenantId: string
  ): Promise<{ role?: OrganizationRole; permissions: OrganizationPermission[] }> {
    try {
      const member = await this.memberRepository.findOne({
        where: { userId, tenantId, isActive: true }
      });

      if (!member) {
        return { permissions: [] };
      }

      return {
        role: member.role,
        permissions: member.permissions
      };
    } catch (error) {
      this.logger.error('Error getting member permissions:', error);
      return { permissions: [] };
    }
  }

  async createInvitation(
    email: string,
    tenantId: string,
    invitedBy: string,
    proposedRole: OrganizationRole = OrganizationRole.MEMBER,
    proposedPermissions?: OrganizationPermission[],
    message?: string,
    expiresInDays: number = 7
  ): Promise<{ success: boolean; error?: string; invitation?: OrganizationInvitation }> {
    try {
      // Check if user is already a member
      const existingUser = await this.userRepository.findOne({
        where: { email },
        relations: ['tenants']
      });

      if (existingUser?.tenants?.some(t => t.id === tenantId)) {
        return { success: false, error: 'User is already a member of this organization' };
      }

      // Check for existing pending invitation
      const existingInvitation = await this.invitationRepository.findOne({
        where: {
          email,
          tenantId,
          status: InvitationStatus.PENDING
        }
      });

      if (existingInvitation && !existingInvitation.isExpired()) {
        return { success: false, error: 'Pending invitation already exists for this email' };
      }

      // Cancel existing pending invitation if expired
      if (existingInvitation) {
        existingInvitation.status = InvitationStatus.EXPIRED;
        await this.invitationRepository.save(existingInvitation);
      }

      // Create new invitation
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      const invitation = this.invitationRepository.create({
        email,
        tenantId,
        invitedBy,
        proposedRole,
        proposedPermissions: proposedPermissions || DEFAULT_PERMISSIONS[proposedRole],
        token,
        expiresAt,
        message
      });

      const saved = await this.invitationRepository.save(invitation);
      return { success: true, invitation: saved };
    } catch (error) {
      this.logger.error('Error creating invitation:', error);
      return { success: false, error: 'Failed to create invitation' };
    }
  }

  async getOrganizationInvitations(tenantId: string): Promise<InvitationInfo[]> {
    try {
      const invitations = await this.invitationRepository.find({
        where: { tenantId },
        relations: ['invitedByUser'],
        order: { createdAt: 'DESC' }
      });

      return invitations.map(invitation => ({
        id: invitation.id,
        email: invitation.email,
        proposedRole: invitation.proposedRole,
        proposedPermissions: invitation.proposedPermissions,
        status: invitation.status,
        invitedBy: invitation.invitedBy,
        invitedByName: `${invitation.invitedByUser.firstName} ${invitation.invitedByUser.lastName}`,
        message: invitation.message,
        createdAt: invitation.createdAt,
        expiresAt: invitation.expiresAt
      }));
    } catch (error) {
      this.logger.error('Error fetching organization invitations:', error);
      return [];
    }
  }

  async getOrganizationMembersNotInSlack(tenantId: string): Promise<{
    members: Array<{
      userId: string;
      email: string;
      firstName: string;
      lastName: string;
      role: OrganizationRole;
    }>;
  }> {
    try {
      // Get all organization members
      const members = await this.memberRepository.find({
        where: { tenantId, isActive: true },
        relations: ['user']
      });

      // Get all slack users for this tenant
      const slackUsers = await this.slackUserRepository.find({
        where: { tenantId }
      });

      const slackEmails = new Set(slackUsers.map(su => su.email).filter(email => email));

      // Filter members not in slack
      const membersNotInSlack = members.filter(member =>
        member.user.email && !slackEmails.has(member.user.email)
      );

      return {
        members: membersNotInSlack.map(member => ({
          userId: member.userId,
          email: member.user.email,
          firstName: member.user.firstName,
          lastName: member.user.lastName,
          role: member.role
        }))
      };
    } catch (error) {
      this.logger.error('Error getting members not in Slack:', error);
      return { members: [] };
    }
  }
}