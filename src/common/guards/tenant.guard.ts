import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { OrganizationMember } from "../../database/entities/organization-member.entity";

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    @InjectRepository(OrganizationMember)
    private organizationMemberRepository: Repository<OrganizationMember>
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request["user"];
    const tenantId = request.params.tenantId;

    if (!user || !tenantId) {
      throw new ForbiddenException(
        "User authentication and tenant ID required"
      );
    }

    const membership = await this.organizationMemberRepository.findOne({
      where: {
        userId: user.sub,
        tenantId,
      },
    });

    if (!membership) {
      throw new ForbiddenException("User is not a member of this tenant");
    }

    request["tenantMembership"] = membership;
    return true;
  }
}
