import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Tenant } from "../database/entities/tenant.entity";
import { User } from "../database/entities/user.entity";
import { OrganizationMember } from "../database/entities/organization-member.entity";
import { OrganizationRole } from "../database/types";
import { CreateTenantDto } from "./dto/create-tenant.dto";

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(OrganizationMember)
    private organizationMemberRepository: Repository<OrganizationMember>
  ) {}

  async createTenant(userId: string, createTenantDto: CreateTenantDto) {
    // Check if slug is already taken
    const existingTenant = await this.tenantRepository.findOne({
      where: { slug: createTenantDto.slug },
    });

    if (existingTenant) {
      throw new ConflictException("Tenant with this slug already exists");
    }

    // Create tenant
    const tenant = this.tenantRepository.create(createTenantDto);
    await this.tenantRepository.save(tenant);

    // Get user
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Create organization membership with owner role
    const membership = this.organizationMemberRepository.create({
      userId,
      tenantId: tenant.id,
      role: OrganizationRole.OWNER,
      permissions: [], // Owners have all permissions implicitly
    });

    await this.organizationMemberRepository.save(membership);

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      isActive: tenant.isActive,
      createdAt: tenant.createdAt,
    };
  }

  async getTenantInfo(tenantId: string, requestingUserId: string) {
    // Verify user has access to this tenant
    const membership = await this.organizationMemberRepository.findOne({
      where: { tenantId, userId: requestingUserId },
    });

    if (!membership) {
      throw new ForbiddenException("Access denied to this tenant");
    }

    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException("Tenant not found");
    }

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      isActive: tenant.isActive,
      slackConfig: tenant.slackConfig,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    };
  }

  async getUserTenants(userId: string) {
    const memberships = await this.organizationMemberRepository.find({
      where: { userId },
      relations: ["tenant"],
    });

    return memberships.map((membership) => ({
      id: membership.tenant.id,
      name: membership.tenant.name,
      slug: membership.tenant.slug,
      role: membership.role,
      joinedAt: membership.joinedAt,
      isSlackConfigured: !!membership.tenant.slackConfig?.botAccessToken,
    }));
  }
}
