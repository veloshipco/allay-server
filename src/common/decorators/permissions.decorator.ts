import { SetMetadata } from '@nestjs/common';
import { OrganizationPermission } from '../../database/types';

export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...permissions: OrganizationPermission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);