import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request) => {
          const authCookie = request?.headers?.cookie
            ?.split(";")
            .find((cookie: string) => cookie.trim().startsWith("auth_token="));
          if (!authCookie) return null;

          const [, value] = authCookie.split("=");
          return value;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || "your-secret-key",
    });
  }

  async validate(payload: any) {
    return { userId: payload.sub, email: payload.email };
  }
}
