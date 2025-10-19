import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from "typeorm";
import {
  OrganizationRole,
  OrganizationPermission,
  InvitationStatus,
} from "../types";
import { Tenant } from "./tenant.entity";

@Entity("organization_invitations")
export class OrganizationInvitation {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "tenant_id" })
  tenantId: string;

  @Column()
  email: string;

  @Column({ unique: true })
  token: string;

  @Column({
    name: "proposed_role",
    type: "enum",
    enum: OrganizationRole,
    default: OrganizationRole.MEMBER,
  })
  proposedRole: OrganizationRole;

  @Column({
    name: "proposed_permissions",
    type: "enum",
    enum: OrganizationPermission,
    array: true,
    default: [],
  })
  proposedPermissions: OrganizationPermission[];

  @Column({ nullable: true })
  message: string;

  @Column({ name: "invited_by_user_id" })
  invitedByUserId: string;

  @Column({ name: "expires_at" })
  expiresAt: Date;

  @Column({ name: "accepted_at", nullable: true })
  acceptedAt: Date;

  @Column({ name: "accepted_by_user_id", nullable: true })
  acceptedByUserId: string;

  @Column({
    type: "enum",
    enum: InvitationStatus,
    default: InvitationStatus.PENDING,
  })
  status: InvitationStatus;

  @ManyToOne(() => Tenant, (tenant) => tenant.invitations, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "tenant_id" })
  tenant: Tenant;

  @CreateDateColumn()
  createdAt: Date;
}
