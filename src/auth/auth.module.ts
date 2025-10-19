import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { User } from "../database/entities/user.entity";
import { Session } from "../database/entities/session.entity";
import { OrganizationMember } from "../database/entities/organization-member.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Session, OrganizationMember]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const secret = configService.get<string>(
          "jwt.secret",
          "your-secret-key"
        );
        console.log(
          "🔑 JWT Secret configured:",
          secret ? "Secret found" : "No secret"
        );
        return {
          secret,
          signOptions: { expiresIn: "7d" },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
