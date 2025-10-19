import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  Res,
  Query,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from "@nestjs/common";
import { Request, Response } from "express";
import {
  ConversationsService,
  PlainConversationWithUser,
} from "./conversations.service";
import { UseGuards } from "@nestjs/common";
import { AuthGuard } from "../common/guards/auth.guard";
import { TenantGuard } from "../common/guards/tenant.guard";

@Controller("api/:tenantId/conversations")
@UseGuards(AuthGuard, TenantGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  async getConversations(
    @Param("tenantId") tenantId: string,
    @Query("limit") limit?: string
  ): Promise<{
    conversations: PlainConversationWithUser[];
    lastUpdated: string;
  }> {
    try {
      const conversationLimit = limit ? parseInt(limit, 10) : 50;
      const conversations =
        await this.conversationsService.getConversationsWithUsers(
          tenantId,
          conversationLimit
        );

      return {
        conversations,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      throw new InternalServerErrorException("Failed to fetch conversations");
    }
  }

  @Get("stream")
  async streamConversations(
    @Param("tenantId") tenantId: string,
    @Req() request: Request,
    @Res() res: Response
  ) {
    if (!tenantId) {
      throw new BadRequestException("Tenant ID is required");
    }

    try {
      const stream = this.conversationsService.createSseStream(
        tenantId,
        request
      );

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Cache-Control",
        },
      });
    } catch (error) {
      throw new InternalServerErrorException("Failed to create SSE stream");
    }
  }

  @Post("thread-reply")
  async createThreadReply(
    @Param("tenantId") tenantId: string,
    @Body()
    body: {
      parentConversationId: string;
      messageText: string;
      messageTs: string;
      userId?: string;
      channelId?: string;
    }
  ) {
    const { parentConversationId, messageText, messageTs, userId, channelId } =
      body;

    if (!parentConversationId || !messageText || !messageTs) {
      throw new BadRequestException(
        "Missing required fields: parentConversationId, messageText, messageTs"
      );
    }

    try {
      const result = await this.conversationsService.createThreadReply(
        tenantId,
        parentConversationId,
        messageText,
        messageTs,
        userId,
        channelId
      );

      return result;
    } catch (error) {
      if (error.message === "Parent conversation not found") {
        throw new NotFoundException("Parent conversation not found");
      }
      throw new InternalServerErrorException("Failed to create thread reply");
    }
  }
}
