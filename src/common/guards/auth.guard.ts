import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { IS_PUBLIC_KEY } from "../../auth/decorators/public.decorator";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    console.log("🔐 DEBUG - Route is public:", isPublic);

    if (isPublic) {
      console.log("🔐 DEBUG - Skipping auth for public route");
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromCookie(request);

    if (!token) {
      console.log("🔐 DEBUG - No token found, throwing 401");
      throw new UnauthorizedException("No authentication token provided");
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      console.log("🔐 DEBUG - Token verified successfully:", payload);
      request["user"] = payload;
      return true;
    } catch (error) {
      console.log("🔐 DEBUG - Token verification failed:", error);
      throw new UnauthorizedException("Invalid authentication token");
    }
  }

  private extractTokenFromCookie(request: Request): string | undefined {
    console.log("🍪 DEBUG - All cookies:", request.headers.cookie);
    console.log(
      "🍪 DEBUG - Authorization header:",
      request.headers.authorization
    );

    // Check Authorization header first
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      console.log(
        "🍪 DEBUG - Found token in Authorization header:",
        token ? "Token found" : "No token"
      );
      return token;
    }

    // Fallback to cookie
    const authCookie = request.headers.cookie
      ?.split(";")
      .find((cookie: string) => cookie.trim().startsWith("allay-session="));

    console.log("🍪 DEBUG - Found allay-session cookie:", authCookie);

    if (!authCookie) return undefined;

    const [, value] = authCookie.split("=");
    console.log(
      "🍪 DEBUG - Extracted token:",
      value ? "Token found" : "No token"
    );
    return value;
  }
}
