import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { Tenant } from "../database/entities/tenant.entity";
import { Conversation } from "../database/entities/conversation.entity";
import { SlackUser } from "../database/entities/slack-user.entity";
import * as crypto from "crypto";

interface SlackApiClient {
  botToken: string;
  userToken?: string;
}

interface SlackUserProfile {
  id: string;
  name: string;
  real_name?: string;
  display_name?: string;
  email?: string;
  image_72?: string;
  title?: string;
  is_bot: boolean;
  is_admin: boolean;
  is_owner: boolean;
  tz?: string;
}

interface SlackChannelInfo {
  id: string;
  name: string;
  is_private: boolean;
  is_member: boolean;
  is_archived: boolean;
  topic?: { value: string };
  purpose?: { value: string };
  num_members?: number;
}

const scopes = [
  // Core reading permissions
  "channels:read",
  "groups:read",
  "im:read",
  "mpim:read",
  "reactions:read",
  "team:read",

  // Message history permissions
  "channels:history",
  "groups:history",
  "im:history",
  "mpim:history",

  // Writing permissions
  "chat:write",
  "reactions:write",

  // Channel management
  "channels:join",
  "groups:write",

  // User information
  "users:read",
  "users:read.email",

  // Enhanced user interaction
  "chat:write.public",
  "chat:write.customize",
];

const userScopes = [
  "chat:write", // User scope for posting as the user
];

@Injectable()
export class SlackService {
  private readonly logger = new Logger(SlackService.name);

  constructor(
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(SlackUser)
    private slackUserRepository: Repository<SlackUser>,
    private readonly configService: ConfigService
  ) {}

  private getRedirectUrl(tenantId: string) {
    const baseUrl =
      this.configService.get<string>("forwardedHost") ||
      `http://localhost:${this.configService.get<number>("port")}`;
    return `${baseUrl}/api/slack/callback`;
  }

  async getSlackStatus(tenantId: string) {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });

    if (!tenant || !tenant.slackConfig) {
      return {
        isConnected: false,
        teamName: null,
        connectedAt: null,
      };
    }

    return {
      isConnected: !!tenant.slackConfig.botAccessToken,
      teamName: tenant.slackConfig.teamName || null,
      connectedAt: tenant.slackConfig.connectedAt || null,
      botUserId: tenant.slackConfig.botUserId || null,
      teamId: tenant.slackConfig.teamId || null,
    };
  }

  async installSlack(tenantId: string) {
    //will handle tactual tenants later after testing
    try {
      const url = `https://slack.com/oauth/v2/authorize?client_id=${this.configService.get<string>(
        "slack.clientId"
      )}&scope=${scopes.join(",")}&user_scope=${userScopes.join(",")}&redirect_uri=${encodeURIComponent(this.getRedirectUrl(tenantId))}&state=${encodeURIComponent(tenantId)}`;

      console.log("url", url);
      return url;
    } catch (error) {
      throw new InternalServerErrorException("Failed to initiate Slack OAuth");
    }
  }

  async handleSlackCallback(code: string, tenantId: string, error: string) {
    try {
      if (error) {
        throw new BadRequestException(error);
      }
      if (!code) {
        throw new BadRequestException("Missing authorization code");
      }
      if (!tenantId) {
        throw new BadRequestException("Missing state parameter");
      }
      const result = await fetch("https://slack.com/api/oauth.v2.access", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: this.configService.get<string>("slack.clientId"),
          client_secret: this.configService.get<string>("slack.clientSecret"),
          code: code,
          redirect_uri: this.getRedirectUrl(tenantId),
        }),
      });

      const data = await result.json();

      if (!data.ok) {
        throw new BadRequestException(data.error);
      }

      return data;
      // Store user token if available
      //  if (data.authed_user && data.authed_user.access_token) {
      //   await this.slackService.storeUserToken(
      //     tenantId,
      //     data.authed_user,
      //     data.access_token
      //   );
      // }

      // // Update tenant with Slack configuration
      // await this.slackService.updateTenantSlackConfig(tenantId, {
      //   botToken: data.access_token,
      //   teamId: data.team.id,
      //   teamName: data.team.name,
      //   installedBy: data.authed_user?.id,
      //   signingSecret: this.configService.get<string>("slack.signingSecret"),
      // });

      // return res.redirect(
      //   new URL(`/${tenantId}/integrations?success=true`, baseUrl).toString()
      // );
    } catch (error) {
      throw new InternalServerErrorException("Failed to handle Slack callback");
    }
  }

  async getConversations(tenantId: string, limit = 50) {
    return this.conversationRepository.find({
      where: { tenantId },
      relations: ["user"],
      order: { slackTimestamp: "DESC" },
      take: limit,
    });
  }

  async getSlackUsers(
    tenantId: string,
    includeInactive = false,
    search?: string
  ) {
    const whereCondition: any = { tenantId };

    if (!includeInactive) {
      whereCondition.isActive = true;
    }

    if (search) {
      whereCondition.displayName = search; // This would need more sophisticated search in production
    }

    return this.slackUserRepository.find({
      where: whereCondition,
      order: { displayName: "ASC" },
    });
  }

  async verifySlackSignature(
    body: string,
    signature: string,
    timestamp: string
  ): Promise<boolean> {
    const signingSecret = this.configService.get<string>("slack.signingSecret");
    if (!signingSecret) {
      this.logger.warn("Slack signing secret not configured");
      return false;
    }

    const hmac = crypto.createHmac("sha256", signingSecret);
    const [version, hash] = signature.split("=");

    hmac.update(`${timestamp}:${body}`);
    const expectedHash = hmac.digest("hex");

    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash));
  }

  async createSlackClient(tenantId: string): Promise<SlackApiClient | null> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });

    if (!tenant || !tenant.slackConfig?.botAccessToken) {
      return null;
    }

    return {
      botToken: tenant.slackConfig.botAccessToken,
    };
  }

  async storeUserToken(tenantId: string, authedUser: any, accessToken: string) {
    try {
      const client = await this.createSlackClient(tenantId);
      if (!client) {
        throw new Error("Failed to create Slack client");
      }

      const userId = authedUser.id;
      const userProfile = await this.fetchUserInfo(client, userId);

      if (userProfile) {
        const compositeId = `${tenantId}-${userId}`;

        const slackUser = this.slackUserRepository.create({
          id: compositeId,
          tenantId,
          slackUserId: userId,
          realName: userProfile.real_name,
          displayName: userProfile.display_name,
          email: userProfile.email,
          profileImage: userProfile.image_72,
          title: userProfile.title,
          isBot: userProfile.is_bot,
          isAdmin: userProfile.is_admin,
          isOwner: userProfile.is_owner,
          timezone: userProfile.tz,
          userToken: accessToken,
          scopes: authedUser.scope ? authedUser.scope.split(",") : [],
          lastSeenAt: new Date(),
        });

        await this.slackUserRepository.save(slackUser);

        this.logger.log(
          `Stored user token for: ${userProfile.real_name || userProfile.name}`
        );
      }
    } catch (error) {
      this.logger.error("Failed to store user token:", error);
      throw error;
    }
  }

  async updateTenantSlackConfig(
    tenantId: string,
    config: {
      botToken: string;
      teamId: string;
      teamName: string;
      installedBy?: string;
      signingSecret?: string;
    }
  ) {
    try {
      const tenant = await this.tenantRepository.findOne({
        where: { id: tenantId },
      });

      if (!tenant) {
        throw new Error("Tenant not found");
      }

      tenant.slackConfig = {
        ...tenant.slackConfig,
        botAccessToken: config.botToken,
        teamId: config.teamId,
        teamName: config.teamName,
        botUserId: config.installedBy,
        connectedAt: new Date().toISOString(),
        signingSecret: config.signingSecret,
      };

      await this.tenantRepository.save(tenant);
      return { success: true };
    } catch (error) {
      this.logger.error("Failed to update tenant Slack config:", error);
      return { success: false };
    }
  }

  async fetchUserInfo(
    client: SlackApiClient,
    userId: string
  ): Promise<SlackUserProfile | null> {
    try {
      const response = await fetch("https://slack.com/api/users.info", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${client.botToken}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ user: userId }),
      });

      const data = await response.json();

      if (!data.ok) {
        this.logger.error("Slack API error:", data.error);
        return null;
      }

      const user = data.user;
      return {
        id: user.id,
        name: user.name,
        real_name: user.real_name,
        display_name: user.profile?.display_name,
        email: user.profile?.email,
        image_72: user.profile?.image_72,
        title: user.profile?.title,
        is_bot: user.is_bot || false,
        is_admin: user.is_admin || false,
        is_owner: user.is_owner || false,
        tz: user.tz,
      };
    } catch (error) {
      this.logger.error("Error fetching user info:", error);
      return null;
    }
  }

  async getChannels(tenantId: string): Promise<any[]> {
    const client = await this.createSlackClient(tenantId);
    if (!client) {
      throw new Error("Slack not connected");
    }

    try {
      const response = await fetch("https://slack.com/api/conversations.list", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${client.botToken}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          types: "public_channel,private_channel",
          exclude_archived: "true",
        }),
      });

      const data = await response.json();

      if (!data.ok) {
        this.logger.error("Slack API error:", data.error);
        return [];
      }

      return data.channels || [];
    } catch (error) {
      this.logger.error("Error fetching channel list:", error);
      return [];
    }
  }

  async joinChannel(tenantId: string, channelId: string): Promise<boolean> {
    const client = await this.createSlackClient(tenantId);
    if (!client) {
      throw new Error("Slack not connected");
    }

    try {
      const response = await fetch("https://slack.com/api/conversations.join", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${client.botToken}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ channel: channelId }),
      });

      const data = await response.json();

      if (!data.ok) {
        this.logger.error("Error joining channel:", data.error);
        return false;
      }

      this.logger.log(`Successfully joined channel: ${channelId}`);
      return true;
    } catch (error) {
      this.logger.error("Error joining channel:", error);
      return false;
    }
  }

  async postMessage(
    tenantId: string,
    channelId: string,
    message: string,
    threadTs?: string
  ) {
    const client = await this.createSlackClient(tenantId);
    if (!client) {
      throw new Error("Slack not connected");
    }

    try {
      const body = new URLSearchParams({
        channel: channelId,
        text: message,
      });

      if (threadTs) {
        body.append("thread_ts", threadTs);
      }

      const response = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${client.botToken}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      });

      const data = await response.json();

      if (!data.ok) {
        this.logger.error("Error posting message:", data.error);
        throw new Error(data.error);
      }

      return {
        success: true,
        messageTs: data.ts,
        threadTs,
      };
    } catch (error) {
      this.logger.error("Error posting message:", error);
      throw error;
    }
  }

  async disconnectSlack(tenantId: string) {
    try {
      const client = await this.createSlackClient(tenantId);

      // Revoke bot token if available
      if (client?.botToken) {
        try {
          await fetch("https://slack.com/api/auth.revoke", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${client.botToken}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
          });
        } catch (error) {
          this.logger.warn("Failed to revoke bot token:", error);
        }
      }

      // Clear user tokens
      await this.slackUserRepository.update(
        { tenantId },
        { userToken: undefined, scopes: undefined, isActive: false }
      );

      // Update tenant config
      const tenant = await this.tenantRepository.findOne({
        where: { id: tenantId },
      });

      if (tenant) {
        tenant.slackConfig = null;
        await this.tenantRepository.save(tenant);
      }

      this.logger.log(
        `Successfully disconnected Slack for tenant: ${tenantId}`
      );
    } catch (error) {
      this.logger.error("Error disconnecting Slack:", error);
      throw error;
    }
  }

  async getUserAuthStatus(tenantId: string, userId?: string) {
    try {
      let whereCondition: any = { tenantId };

      if (userId) {
        const compositeId = `${tenantId}-${userId}`;
        whereCondition.id = compositeId;
      }

      const users = await this.slackUserRepository.find({
        where: whereCondition,
        select: [
          "slackUserId",
          "displayName",
          "userToken",
          "isActive",
          "lastSeenAt",
        ],
      });

      return {
        users: users.map((user) => ({
          slackUserId: user.slackUserId,
          displayName: user.displayName,
          hasUserToken: !!user.userToken,
          isActive: user.isActive,
          lastSeenAt: user.lastSeenAt,
        })),
      };
    } catch (error) {
      this.logger.error("Error checking user auth status:", error);
      throw error;
    }
  }

  async processEvent(tenantId: string, event: any) {
    this.logger.log(`Processing event for tenant ${tenantId}:`, event.type);

    // This would handle different event types
    // For now, just log the event
    switch (event.type) {
      case "message":
        await this.handleMessageEvent(tenantId, event);
        break;
      case "reaction_added":
      case "reaction_removed":
        await this.handleReactionEvent(tenantId, event);
        break;
      case "member_joined_channel":
      case "member_left_channel":
        await this.handleMemberEvent(tenantId, event);
        break;
      default:
        this.logger.log(`Unhandled event type: ${event.type}`);
    }
  }

  private async handleMessageEvent(tenantId: string, event: any) {
    // Handle message events
    this.logger.log(`Message event: ${event.subtype || "message"}`);
  }

  private async handleReactionEvent(tenantId: string, event: any) {
    // Handle reaction events
    this.logger.log(`Reaction event: ${event.type}`);
  }

  private async handleMemberEvent(tenantId: string, event: any) {
    // Handle member events
    this.logger.log(`Member event: ${event.type}`);
  }
}
