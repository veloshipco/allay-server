import { getDataSource } from "../src/database/datasource.config";
import { ConfigService } from "@nestjs/config";

async function generateMigration() {
  const configService = new ConfigService();

  const migrationName = process.argv[2];

  if (!migrationName) {
    console.error(
      "Please provide a migration name: npm run migration:generate <migration-name>"
    );
    process.exit(1);
  }

  console.log(`Generating migration: ${migrationName}`);

  try {
    const dataSource = getDataSource(configService);
    await dataSource.initialize();
    console.log("Database connection established.");

    const migration = await dataSource.runMigrations();
    console.log(`Migration '${migrationName}' generated successfully.`);

    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error("Error generating migration:", error);
    process.exit(1);
  }
}

generateMigration();
