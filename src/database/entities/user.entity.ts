import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
} from "typeorm";
import { OrganizationMember } from "./organization-member.entity";
import { Session } from "./session.entity";
import { OrganizationInvitation } from "./organization-invitation.entity";
import { Tenant } from "./tenant.entity";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => OrganizationMember, (member) => member.user)
  organizationMemberships: OrganizationMember[];

  @OneToMany(() => Session, (session) => session.user)
  sessions: Session[];

  @OneToMany(() => OrganizationInvitation, (invitation) => invitation.invitedByUser)
  invitations: OrganizationInvitation[];

  @ManyToMany(() => Tenant, (tenant) => tenant.members)
  @JoinTable({
    name: "user_tenants",
    joinColumn: { name: "user_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "tenant_id", referencedColumnName: "id" },
  })
  tenants: Tenant[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
