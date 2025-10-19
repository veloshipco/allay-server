import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from "typeorm";
import {
  OrganizationRole,
  OrganizationPermission,
} from "../types";

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

  // Use string references to avoid circular dependencies
  @ManyToOne("User", "organizationMemberships", { onDelete: "CASCADE" })
  user: any;

  @ManyToOne("Tenant", { onDelete: "CASCADE" })
  tenant: any;
}