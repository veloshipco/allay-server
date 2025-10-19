// Enums and types that can be shared across entities without circular dependencies

export enum OrganizationRole {
  MEMBER = "MEMBER",
  ADMIN = "ADMIN",
  OWNER = "OWNER",
}

export enum OrganizationPermission {
  MANAGE_MEMBERS = "MANAGE_MEMBERS",
  INVITE_MEMBERS = "INVITE_MEMBERS",
  VIEW_ANALYTICS = "VIEW_ANALYTICS",
  MANAGE_SLACK = "MANAGE_SLACK",
}

export enum InvitationStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  EXPIRED = "EXPIRED",
  REVOKED = "REVOKED",
}

export interface SlackConfig {
  botAccessToken?: string;
  botScope?: string[];
  botUserId?: string;
  teamId?: string;
  teamName?: string;
  signingSecret?: string;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  eventsCallbackUrl?: string;
  isConfigured?: boolean;
  connectedAt?: string;
  disconnectedAt?: string;
}

export interface Reaction {
  name: string;
  count: number;
  users: string[];
}

export interface ThreadReply {
  id: string;
  messageText: string;
  messageTs: string;
  userId: string;
  channelId: string;
  postedAt: Date;
}
