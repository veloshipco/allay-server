import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("slack_users")
export class SlackUser {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "tenant_id" })
  tenantId: string;

  @Column({ name: "slack_user_id", unique: true })
  slackUserId: string;

  @Column({ name: "real_name", nullable: true })
  realName: string;

  @Column({ name: "display_name", nullable: true })
  displayName: string;

  @Column({ nullable: true })
  email: string;

  @Column({ name: "profile_image", nullable: true })
  profileImage: string;

  @Column({ nullable: true })
  title: string;

  @Column({ name: "is_bot", default: false })
  isBot: boolean;

  @Column({ name: "is_admin", default: false })
  isAdmin: boolean;

  @Column({ name: "is_owner", default: false })
  isOwner: boolean;

  @Column({ nullable: true })
  timezone: string;

  @Column({ name: "user_token", nullable: true })
  userToken: string;

  @Column({ type: "text", array: true, nullable: true })
  scopes: string[];

  @Column({ name: "token_expires_at", nullable: true })
  tokenExpiresAt: Date;

  @Column({ name: "is_active", default: true })
  isActive: boolean;

  @Column({ name: "last_seen_at", nullable: true })
  lastSeenAt: Date;

  // Use string references to avoid circular dependencies
  @ManyToOne("Tenant", "slackUsers", { onDelete: "CASCADE" })
  tenant: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}