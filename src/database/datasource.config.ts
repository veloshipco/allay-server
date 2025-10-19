import { DataSource } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { User } from "./entities/user.entity";
import { Tenant } from "./entities/tenant.entity";
import { Conversation } from "./entities/conversation.entity";
import { SlackUser } from "./entities/slack-user.entity";
import { OrganizationMember } from "./entities/organization-member.entity";
import { OrganizationInvitation } from "./entities/organization-invitation.entity";
import { Session } from "./entities/session.entity";

export const DatabaseProviders = [
  {
    provide: "DATA_SOURCE",
    useFactory: async (configService: ConfigService) => {
      const dataSource = new DataSource({
        type: "postgres",
        host: configService.get<string>("DATABASE_HOST", "localhost"),
        port: configService.get<number>("DATABASE_PORT", 5432),
        username: configService.get<string>("DATABASE_USERNAME", "postgres"),
        password: configService.get<string>("DATABASE_PASSWORD", ""),
        database: configService.get<string>("DATABASE_NAME", "postgres"),
        ssl: configService.get<string>("DATABASE_HOST")?.includes("supabase.co")
          ? { rejectUnauthorized: false }
          : configService.get<boolean>("DATABASE_SSL", false),
        entities: [
          User,
          Tenant,
          Conversation,
          SlackUser,
          OrganizationMember,
          OrganizationInvitation,
          Session,
        ],
        synchronize: configService.get<string>("NODE_ENV") === "development",
        logging: configService.get<string>("NODE_ENV") === "development",
        migrations: ["dist/database/migrations/*.js"],
        migrationsRun: false,
      });

      await dataSource.initialize();
      return dataSource;
    },
    inject: [ConfigService],
  },
];

export const getDataSource = (configService: ConfigService): DataSource => {
  return new DataSource({
    type: "postgres",
    host: configService.get<string>("DATABASE_HOST", "localhost"),
    port: configService.get<number>("DATABASE_PORT", 5432),
    username: configService.get<string>("DATABASE_USERNAME", "postgres"),
    password: configService.get<string>("DATABASE_PASSWORD", ""),
    database: configService.get<string>("DATABASE_NAME", "postgres"),
    ssl: configService.get<string>("DATABASE_HOST")?.includes("supabase.co")
      ? { rejectUnauthorized: false }
      : configService.get<boolean>("DATABASE_SSL", false),
    entities: [
      User,
      Tenant,
      Conversation,
      SlackUser,
      OrganizationMember,
      OrganizationInvitation,
      Session,
    ],
    synchronize: configService.get<string>("NODE_ENV") === "development",
    logging: configService.get<string>("NODE_ENV") === "development",
    migrations: ["src/database/migrations/*.ts"],
    migrationsRun: false,
  });
};
