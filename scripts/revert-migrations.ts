import { getDataSource } from "../src/database/datasource.config";
import { ConfigService } from "@nestjs/config";

async function revertMigrations() {
  const configService = new ConfigService();

  console.log("Reverting database migrations...");

  try {
    const dataSource = getDataSource(configService);
    await dataSource.initialize();
    console.log("Database connection established.");

    await dataSource.undoLastMigration();
    console.log("Successfully reverted the last migration.");

    console.log("Migration revert completed successfully.");
    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error("Error reverting migrations:", error);
    process.exit(1);
  }
}

revertMigrations();
