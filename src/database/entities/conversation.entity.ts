import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Reaction, ThreadReply } from "../types";
import { Tenant } from "./tenant.entity";
import { SlackUser } from "./slack-user.entity";

@Entity("conversations")
export class Conversation {
  @PrimaryColumn()
  id: string; // Slack message timestamp

  @Column({ name: "tenant_id" })
  tenantId: string;

  @Column({ name: "channel_id" })
  channelId: string;

  @Column({ name: "channel_name", nullable: true })
  channelName: string;

  @Column({ type: "text" })
  content: string;

  @Column({ name: "user_id" })
  userId: string;

  @Column({ name: "user_name", nullable: true })
  userName: string;

  @Column({ type: "jsonb", default: [] })
  reactions: Reaction[];

  @Column({ type: "jsonb", default: [] })
  threadReplies: ThreadReply[];

  @Column({ name: "thread_ts", nullable: true })
  threadTs: string;

  @Column({ name: "slack_timestamp" })
  slackTimestamp: Date;

  @ManyToOne(() => Tenant, (tenant) => tenant.conversations, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "tenant_id" })
  tenant: Tenant;

  @ManyToOne(() => SlackUser, { nullable: true })
  @JoinColumn({ name: "user_id", referencedColumnName: "slackUserId" })
  user: SlackUser;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
