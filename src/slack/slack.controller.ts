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
import { AuthGuard } from "../common/guards/auth.guard";
import { TenantGuard } from "../common/guards/tenant.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { UseGuards } from "@nestjs/common";

@Controller(":tenantId/slack")
@UseGuards(AuthGuard, TenantGuard, PermissionsGuard)
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

  @Get("install")
  @Permissions(OrganizationPermission.MANAGE_SLACK)
  async installSlack(
    @Param("tenantId") tenantId: string,
    @Res() res: Response
  ) {
    try {
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

      const baseUrl =
        this.configService.get<string>("cors.origin")[0] ||
        "http://localhost:3000";
      const redirectUrl = new URL(`/api/${tenantId}/slack/callback`, baseUrl);

      const url = `https://slack.com/oauth/v2/authorize?client_id=${this.configService.get<string>(
        "slack.clientId"
      )}&scope=${scopes.join(",")}&user_scope=${userScopes.join(",")}&redirect_uri=${encodeURIComponent(redirectUrl.toString())}&state=${encodeURIComponent(tenantId)}`;

      return res.redirect(url);
    } catch (error) {
      throw new InternalServerErrorException("Failed to initiate Slack OAuth");
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
    if (!tenantId) {
      throw new BadRequestException("Missing state parameter");
    }

    if (error) {
      const baseUrl =
        this.configService.get<string>("cors.origin")[0] ||
        "http://localhost:3000";
      return res.redirect(
        new URL(`/${tenantId}/integrations?error=${error}`, baseUrl).toString()
      );
    }

    if (!code) {
      throw new BadRequestException("Missing authorization code");
    }

    try {
      const baseUrl =
        this.configService.get<string>("cors.origin")[0] ||
        "http://localhost:3000";
      const redirectUri = `${baseUrl}/api/${tenantId}/slack/callback`;

      const result = await fetch("https://slack.com/api/oauth.v2.access", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: this.configService.get<string>("slack.clientId"),
          client_secret: this.configService.get<string>("slack.clientSecret"),
          code: code,
          redirect_uri: redirectUri,
        }),
      });

      const data = await result.json();

      if (!data.ok) {
        throw new Error(`Slack OAuth error: ${data.error}`);
      }

      // Store user token if available
      if (data.authed_user && data.authed_user.access_token) {
        await this.slackService.storeUserToken(
          tenantId,
          data.authed_user,
          data.access_token
        );
      }

      // Update tenant with Slack configuration
      await this.slackService.updateTenantSlackConfig(tenantId, {
        botToken: data.access_token,
        teamId: data.team.id,
        teamName: data.team.name,
        installedBy: data.authed_user?.id,
        signingSecret: this.configService.get<string>("slack.signingSecret"),
      });

      return res.redirect(
        new URL(`/${tenantId}/integrations?success=true`, baseUrl).toString()
      );
    } catch (error) {
      console.error("Error processing Slack OAuth callback:", error);
      const baseUrl =
        this.configService.get<string>("cors.origin")[0] ||
        "http://localhost:3000";
      return res.redirect(
        new URL(
          `/${tenantId}/integrations?error=oauth_failed`,
          baseUrl
        ).toString()
      );
    }
  }

  @Get("user-callback")
  @Public()
  async handleUserCallback(
    @Query("code") code: string,
    @Query("state") state: string,
    @Res() res: Response
  ) {
    // This would handle user-specific OAuth flow
    // For now, redirect to the main callback
    return this.handleSlackCallback(code, state, null, res);
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
