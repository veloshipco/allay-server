import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from '../database/entities/conversation.entity';
import { SlackUser } from '../database/entities/slack-user.entity';
import { Tenant } from '../database/entities/tenant.entity';
import { ThreadReply } from '../database/types';
import { SlackService } from '../slack/slack.service';

interface PlainSlackUser {
  id: string;
  tenantId: string;
  slackUserId: string;
  realName?: string;
  displayName?: string;
  email?: string;
  profileImage?: string;
  title?: string;
  isBot: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  timezone?: string;
  userToken?: string;
  scopes?: string[];
  tokenExpiresAt?: string;
  isActive: boolean;
  lastSeenAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface PlainConversationWithUser {
  id: string;
  tenantId: string;
  channelId: string;
  channelName?: string;
  content: string;
  userId: string;
  userName?: string;
  reactions: any[];
  threadReplies: ThreadReply[];
  threadTs?: string;
  slackTimestamp: string;
  createdAt: string;
  updatedAt: string;
  slackUser?: PlainSlackUser;
}

// Export interfaces for use in controllers
export type { PlainSlackUser, PlainConversationWithUser };

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);
  private readonly sseConnections = new Map<string, Set<any>>();

  constructor(
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(SlackUser)
    private slackUserRepository: Repository<SlackUser>,
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    private readonly slackService: SlackService,
  ) {}

  async getConversationsWithUsers(tenantId: string, limit = 50): Promise<PlainConversationWithUser[]> {
    try {
      const conversations = await this.conversationRepository.find({
        where: { tenantId },
        order: { slackTimestamp: 'DESC' },
        take: limit,
      });

      const enhancedConversations: PlainConversationWithUser[] = [];

      for (const conversation of conversations) {
        const slackUser = await this.slackUserRepository.findOne({
          where: {
            tenantId,
            slackUserId: conversation.userId,
          },
        });

        enhancedConversations.push(this.serializeConversation(conversation, slackUser || undefined));
      }

      return enhancedConversations;
    } catch (error) {
      this.logger.error('Error fetching conversations with users:', error);
      return [];
    }
  }

  async createThreadReply(
    tenantId: string,
    parentConversationId: string,
    messageText: string,
    messageTs: string,
    userId?: string,
    channelId?: string,
  ) {
    try {
      // Find the parent conversation
      const parentConversation = await this.conversationRepository.findOne({
        where: { id: parentConversationId, tenantId },
      });

      if (!parentConversation) {
        throw new Error('Parent conversation not found');
      }

      // Get user information
      let userName: string | undefined;
      let resolvedUserId = userId;

      if (userId && userId !== 'current_user') {
        const slackUser = await this.slackUserRepository.findOne({
          where: { tenantId, slackUserId: userId },
        });

        if (slackUser) {
          userName = slackUser.realName || slackUser.displayName;
        } else {
          userName = 'Unknown User';
        }
      } else {
        resolvedUserId = 'bot_user';
        userName = 'Dashboard User';
      }

      // Create thread reply as separate conversation record
      const threadReplyConversation = this.conversationRepository.create({
        id: messageTs,
        tenantId,
        channelId: channelId || parentConversation.channelId,
        channelName: parentConversation.channelName,
        content: messageText,
        userId: resolvedUserId || 'unknown',
        userName: userName || 'Unknown User',
        threadTs: parentConversationId,
        slackTimestamp: new Date(parseFloat(messageTs) * 1000),
        reactions: [],
        threadReplies: [],
      });

      await this.conversationRepository.save(threadReplyConversation);

      // Add to parent conversation's threadReplies array
      const threadReply: ThreadReply = {
        id: messageTs,
        messageText: messageText,
        messageTs: messageTs,
        userId: resolvedUserId || 'unknown',
        channelId: channelId || parentConversation.channelId,
        postedAt: new Date(),
      };

      const updatedThreadReplies = [...parentConversation.threadReplies];

      // Check if reply already exists in parent's threadReplies
      const existingReplyIndex = updatedThreadReplies.findIndex(r => r.messageTs === messageTs);
      if (existingReplyIndex < 0) {
        updatedThreadReplies.push(threadReply);
        parentConversation.threadReplies = updatedThreadReplies;
        await this.conversationRepository.save(parentConversation);
      }

      // Broadcast SSE update
      this.broadcastConversationUpdate(tenantId, {
        type: 'new_thread_reply',
        conversationId: threadReplyConversation.id,
        parentConversationId: parentConversation.id,
        content: messageText,
        userName: userName,
        timestamp: threadReplyConversation.slackTimestamp.toISOString(),
      });

      return {
        success: true,
        threadReply: {
          id: threadReplyConversation.id,
          content: threadReplyConversation.content,
          userName: threadReplyConversation.userName,
          timestamp: threadReplyConversation.slackTimestamp.toISOString(),
          threadTs: threadReplyConversation.threadTs,
        },
      };
    } catch (error) {
      this.logger.error('Error storing thread reply:', error);
      throw error;
    }
  }

  private serializeSlackUser(user: SlackUser): PlainSlackUser {
    return {
      id: user.id,
      tenantId: user.tenantId,
      slackUserId: user.slackUserId,
      realName: user.realName,
      displayName: user.displayName,
      email: user.email,
      profileImage: user.profileImage,
      title: user.title,
      isBot: user.isBot,
      isAdmin: user.isAdmin,
      isOwner: user.isOwner,
      timezone: user.timezone,
      userToken: user.userToken,
      scopes: user.scopes,
      tokenExpiresAt: user.tokenExpiresAt?.toISOString(),
      isActive: user.isActive,
      lastSeenAt: user.lastSeenAt?.toISOString(),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  private serializeConversation(conversation: Conversation, slackUser?: SlackUser): PlainConversationWithUser {
    return {
      id: conversation.id,
      tenantId: conversation.tenantId,
      channelId: conversation.channelId,
      channelName: conversation.channelName,
      content: conversation.content,
      userId: conversation.userId,
      userName: conversation.userName,
      reactions: conversation.reactions,
      threadReplies: conversation.threadReplies,
      threadTs: conversation.threadTs,
      slackTimestamp: conversation.slackTimestamp.toISOString(),
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      slackUser: slackUser ? this.serializeSlackUser(slackUser) : undefined,
    };
  }

  // SSE Methods
  createSseStream(tenantId: string, request: any) {
    const stream = new ReadableStream({
      start: (controller) => {
        const encoder = new TextEncoder();

        // Send initial connection message
        const data = `data: ${JSON.stringify({ type: 'connected', tenantId })}\n\n`;
        controller.enqueue(encoder.encode(data));

        // Store writer for this tenant
        if (!this.sseConnections.has(tenantId)) {
          this.sseConnections.set(tenantId, new Set());
        }

        const writer = controller;
        this.sseConnections.get(tenantId)!.add(writer);

        // Setup heartbeat to keep connection alive
        const heartbeat = setInterval(() => {
          try {
            const heartbeatData = `data: ${JSON.stringify({
              type: 'heartbeat',
              timestamp: new Date().toISOString()
            })}\n\n`;
            controller.enqueue(encoder.encode(heartbeatData));
          } catch {
            // Connection closed
            clearInterval(heartbeat);
            this.sseConnections.get(tenantId)?.delete(writer);
          }
        }, 30000); // 30 seconds

        // Cleanup on close
        request.signal.addEventListener('abort', () => {
          clearInterval(heartbeat);
          this.sseConnections.get(tenantId)?.delete(writer);
          if (this.sseConnections.get(tenantId)?.size === 0) {
            this.sseConnections.delete(tenantId);
          }
          controller.close();
        });
      },
    });

    return stream;
  }

  broadcastConversationUpdate(tenantId: string, data: unknown) {
    const connections = this.sseConnections.get(tenantId);
    if (!connections || connections.size === 0) {
      return;
    }

    const encoder = new TextEncoder();
    const message = `data: ${JSON.stringify({
      type: 'conversation_update',
      data,
      timestamp: new Date().toISOString()
    })}\n\n`;
    const encodedMessage = encoder.encode(message);

    // Send to all connections for this tenant
    const closedConnections: any[] = [];
    connections.forEach((writer) => {
      try {
        writer.enqueue(encodedMessage);
      } catch {
        // Connection is closed, mark for removal
        closedConnections.push(writer);
      }
    });

    // Clean up closed connections
    closedConnections.forEach((writer) => {
      connections.delete(writer);
    });

    if (connections.size === 0) {
      this.sseConnections.delete(tenantId);
    }
  }
}