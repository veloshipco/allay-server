import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { TenantsService } from "./tenants.service";
import { CreateTenantDto } from "./dto/create-tenant.dto";
import { Public } from "../auth/decorators/public.decorator";

@Controller("api")
export class TenantsController {
  constructor(private tenantsService: TenantsService) {}

  @Public()
  @Post("tenants/create")
  async createTenant(@Body() createTenantDto: CreateTenantDto, @Req() req) {
    const user = req["user"];
    return this.tenantsService.createTenant(user.sub, createTenantDto);
  }

  @Get("tenants")
  async getUserTenants(@Req() req) {
    const user = req["user"];
    return this.tenantsService.getUserTenants(user.sub);
  }

  @Get("tenants/:tenantId/info")
  async getTenantInfo(@Param("tenantId") tenantId: string, @Req() req) {
    const user = req["user"];
    return this.tenantsService.getTenantInfo(tenantId, user.sub);
  }
}
