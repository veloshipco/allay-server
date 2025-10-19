import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpStatus,
  HttpCode,
} from "@nestjs/common";
import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { Public } from "./decorators/public.decorator";

@Controller("api/auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post("register")
  async register(
    @Body() registerDto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.authService.register(
      registerDto,
      req.ip,
      req.get("User-Agent")
    );

    // Set HTTP-only cookie
    res.cookie("allay-session", result.token, {
      httpOnly: true,
      secure: false, // Allow cookies in development
      sameSite: "lax",
      domain: process.env.NODE_ENV === "production" ? undefined : "localhost",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(HttpStatus.CREATED).json({
      ...result.user,
      token: result.token, // Also return token in response for frontend to store
    });
  }

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.authService.login(
      loginDto,
      req.ip,
      req.get("User-Agent")
    );

    // Set HTTP-only cookie
    res.cookie("allay-session", result.token, {
      httpOnly: true,
      secure: false, // Allow cookies in development
      sameSite: "lax",
      domain: process.env.NODE_ENV === "production" ? undefined : "localhost",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      ...result.user,
      token: result.token, // Also return token in response for frontend to store
    });
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = this.extractTokenFromCookie(req);

    if (token) {
      await this.authService.logout(token);
    }

    // Clear cookie
    res.cookie("allay-session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
    });

    res.json({ message: "Logged out successfully" });
  }

  @Get("user-tenants")
  async getUserTenants(@Req() req: Request) {
    // For now, return mock data
    return [];
  }

  private extractTokenFromCookie(request: Request): string | undefined {
    const authCookie = request.headers.cookie
      ?.split(";")
      .find((cookie: string) => cookie.trim().startsWith("allay-session="));
    if (!authCookie) return undefined;

    const [, value] = authCookie.split("=");
    return value;
  }
}
