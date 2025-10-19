import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from "typeorm";

@Entity("sessions")
export class Session {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id" })
  userId: string;

  @Column({ name: "token", unique: true })
  token: string;

  @Column({ name: "ip_address", nullable: true })
  ipAddress: string;

  @Column({ name: "user_agent", nullable: true })
  userAgent: string;

  @Column({ name: "expires_at" })
  expiresAt: Date;

  @Column({ name: "is_active", default: true })
  isActive: boolean;

  // Use string references to avoid circular dependencies
  @ManyToOne("User", "sessions", { onDelete: "CASCADE" })
  user: any;

  @CreateDateColumn()
  createdAt: Date;
}