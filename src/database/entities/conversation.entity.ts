import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Reaction, ThreadReply } from "../types";

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

  // Use string references to avoid circular dependencies
  @ManyToOne("Tenant", "conversations", { onDelete: "CASCADE" })
  tenant: any;

  @ManyToOne("SlackUser", "conversations")
  user: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}