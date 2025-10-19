import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { OrganizationRole, OrganizationPermission } from "../types";
import { User } from "./user.entity";
import { Tenant } from "./tenant.entity";

@Entity("organization_members")
export class OrganizationMember {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id" })
  userId: string;

  @Column({ name: "tenant_id" })
  tenantId: string;

  @Column({
    type: "enum",
    enum: OrganizationRole,
    default: OrganizationRole.MEMBER,
  })
  role: OrganizationRole;

  @Column({
    type: "enum",
    enum: OrganizationPermission,
    array: true,
    default: [],
  })
  permissions: OrganizationPermission[];

  @CreateDateColumn({ name: "joined_at" })
  joinedAt: Date;

  @UpdateDateColumn({ name: "last_active_at" })
  lastActiveAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => User, (user) => user.organizationMemberships, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(() => Tenant, { onDelete: "CASCADE" })
  @JoinColumn({ name: "tenant_id" })
  tenant: Tenant;
}
