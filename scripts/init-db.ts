import { getDataSource } from "../src/database/datasource.config";
import { ConfigService } from "@nestjs/config";

async function initDatabase() {
  const configService = new ConfigService();

  console.log("Initializing database...");

  try {
    const dataSource = getDataSource(configService);
    await dataSource.initialize();
    console.log("Database connection established.");

    // Run synchronization in development only
    if (configService.get<string>("NODE_ENV") === "development") {
      await dataSource.synchronize(true);
      console.log("Database schema synchronized.");
    } else {
      console.log("Production environment detected.");
      console.log("Please run migrations manually using: npm run db:migrate");
      console.log("Or check migration status with: npm run db:status");
    }

    console.log("Database initialization completed successfully.");

    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error("Error initializing database:", error);
    process.exit(1);
  }
}

initDatabase();
