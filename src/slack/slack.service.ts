import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Tenant } from "../database/entities/tenant.entity";
import { Conversation } from "../database/entities/conversation.entity";
import { SlackUser } from "../database/entities/slack-user.entity";

@Injectable()
export class SlackService {
  constructor(
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(SlackUser)
    private slackUserRepository: Repository<SlackUser>
  ) {}

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
    };
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

  // Placeholder for Slack API integration methods
  async postMessage(
    tenantId: string,
    channelId: string,
    message: string,
    threadTs?: string
  ) {
    // This would integrate with Slack API
    // For now, just return a mock response
    return {
      success: true,
      messageTs: new Date().getTime().toString(),
      threadTs,
    };
  }

  async verifySlackSignature(
    body: string,
    signature: string,
    timestamp: string
  ): Promise<boolean> {
    // This would implement proper Slack signature verification
    // For now, just return true
    return true;
  }
}
