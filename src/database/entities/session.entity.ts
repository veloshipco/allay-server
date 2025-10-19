import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from "typeorm";
import { User } from "./user.entity";

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

  @ManyToOne(() => User, (user) => user.sessions, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}
