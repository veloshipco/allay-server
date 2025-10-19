import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToMany,
} from "typeorm";
import { SlackConfig } from "../types";
import { Conversation } from "./conversation.entity";
import { SlackUser } from "./slack-user.entity";
import { OrganizationInvitation } from "./organization-invitation.entity";
import { OrganizationMember } from "./organization-member.entity";
import { User } from "./user.entity";

@Entity("tenants")
export class Tenant {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: "jsonb", nullable: true })
  slackConfig: SlackConfig;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Conversation, (conversation) => conversation.tenant)
  conversations: Conversation[];

  @OneToMany(() => SlackUser, (slackUser) => slackUser.tenant)
  slackUsers: SlackUser[];

  @OneToMany(() => OrganizationInvitation, (invitation) => invitation.tenant)
  invitations: OrganizationInvitation[];

  @OneToMany(() => OrganizationMember, (member) => member.tenant)
  organizationMembers: OrganizationMember[];

  @ManyToMany(() => User, (user) => user.tenants)
  members: User[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
