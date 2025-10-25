import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Res,
  Req,
  Query,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  ForbiddenException,
  HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";
import { ConfigService } from "@nestjs/config";
import { SlackService } from "./slack.service";
import { Public } from "../auth/decorators/public.decorator";
import { Permissions } from "../common/decorators/permissions.decorator";
import { OrganizationPermission } from "../database/types";

@Controller("api/slack")
export class SlackController {
  constructor(
    private readonly slackService: SlackService,
    private readonly configService: ConfigService
  ) {}

  @Get("status")
  async getSlackStatus(@Param("tenantId") tenantId: string) {
    try {
      const status = await this.slackService.getSlackStatus(tenantId);

      return {
        tenantId,
        tenantName: status.teamName || "Unknown",
        isSlackConnected: status.isConnected,
        slackConfig: status.isConnected
          ? {
              hasToken: true,
              teamId: status.teamId,
              teamName: status.teamName,
              botUserId: status.botUserId,
              connectedAt: status.connectedAt,
            }
          : null,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new InternalServerErrorException("Failed to check Slack status");
    }
  }

  @Get("install/:tenantId")
  @Public()
  async installSlack(
    @Param("tenantId") tenantId: string,
    @Res() res: Response
  ) {
    try {
      console.log("installSlack", tenantId);
      const url = await this.slackService.installSlack(tenantId);
      return res.status(HttpStatus.OK).json({ url });
    } catch (error) {
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ error: error.message });
    }
  }

  @Get("callback")
  @Public()
  async handleSlackCallback(
    @Query("code") code: string,
    @Query("state") tenantId: string,
    @Query("error") error: string,
    @Res() res: Response
  ) {
    try {
      const result = await this.slackService.handleSlackCallback(
        code,
        tenantId,
        error
      );
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ error: error.message });
    }
  }

  @Get("user-callback")
  @Public()
  async handleUserCallback(
    @Query("code") code: string,
    @Query("state") state: string,
    @Res() res: Response
  ) {
    return "User callback";
  }

  @Post("events")
  @Public()
  async handleSlackEvents(
    @Param("tenantId") tenantId: string,
    @Req() req: Request,
    @Body() body: any,
    @Res() res: Response
  ) {
    try {
      const signature = req.headers["x-slack-signature"] as string;
      const timestamp = req.headers["x-slack-request-timestamp"] as string;
      const rawBody = JSON.stringify(body);

      // Verify Slack signature
      const isValid = await this.slackService.verifySlackSignature(
        rawBody,
        signature,
        timestamp
      );
      if (!isValid) {
        throw new ForbiddenException("Invalid signature");
      }

      // Handle URL verification challenge
      if (body.type === "url_verification") {
        return res.send(body.challenge);
      }

      // Process events
      await this.slackService.processEvent(tenantId, body);

      return res.status(HttpStatus.OK).send();
    } catch (error) {
      console.error("Error processing Slack event:", error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send();
    }
  }

  @Get("channels")
  async getChannels(@Param("tenantId") tenantId: string) {
    try {
      const channels = await this.slackService.getChannels(tenantId);
      return { channels };
    } catch (error) {
      throw new InternalServerErrorException("Failed to fetch channels");
    }
  }

  @Post("channels")
  @Permissions(OrganizationPermission.MANAGE_SLACK)
  async joinChannel(
    @Param("tenantId") tenantId: string,
    @Body() body: { channelId: string }
  ) {
    try {
      const result = await this.slackService.joinChannel(
        tenantId,
        body.channelId
      );
      return { success: true, result };
    } catch (error) {
      throw new InternalServerErrorException("Failed to join channel");
    }
  }

  @Get("users")
  async getUsers(
    @Param("tenantId") tenantId: string,
    @Query("includeInactive") includeInactive?: string,
    @Query("search") search?: string
  ) {
    try {
      const users = await this.slackService.getSlackUsers(
        tenantId,
        includeInactive === "true",
        search
      );
      return { users };
    } catch (error) {
      throw new InternalServerErrorException("Failed to fetch users");
    }
  }

  @Post("reply")
  @Permissions(OrganizationPermission.SEND_MESSAGES)
  async postMessage(
    @Param("tenantId") tenantId: string,
    @Body()
    body: {
      action: "post_message";
      channelId: string;
      messageText: string;
      threadTs?: string;
    }
  ) {
    try {
      const result = await this.slackService.postMessage(
        tenantId,
        body.channelId,
        body.messageText,
        body.threadTs
      );
      return { success: true, ...result };
    } catch (error) {
      throw new InternalServerErrorException("Failed to post message");
    }
  }

  @Post("disconnect")
  @Permissions(OrganizationPermission.MANAGE_SLACK)
  async disconnectSlack(@Param("tenantId") tenantId: string) {
    try {
      await this.slackService.disconnectSlack(tenantId);
      return { success: true, message: "Slack disconnected successfully" };
    } catch (error) {
      throw new InternalServerErrorException("Failed to disconnect Slack");
    }
  }

  @Get("user-auth")
  async getUserAuthStatus(@Param("tenantId") tenantId: string) {
    try {
      const status = await this.slackService.getUserAuthStatus(tenantId);
      return status;
    } catch (error) {
      throw new InternalServerErrorException(
        "Failed to check user auth status"
      );
    }
  }
}
