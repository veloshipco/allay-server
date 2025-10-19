import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { SlackConfig } from "../types";

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

  // Use string references to avoid circular dependencies
  @OneToMany("Conversation", "tenant")
  conversations: any[];

  @OneToMany("SlackUser", "tenant")
  slackUsers: any[];

  @OneToMany("OrganizationInvitation", "tenant")
  invitations: any[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}