import { getDataSource } from "../src/database/datasource.config";
import { ConfigService } from "@nestjs/config";

async function runMigrations() {
  const configService = new ConfigService();

  console.log("Running database migrations...");

  try {
    const dataSource = getDataSource(configService);
    await dataSource.initialize();
    console.log("Database connection established.");

    // Run migrations
    const migrations = await dataSource.runMigrations();

    if (migrations.length === 0) {
      console.log("No pending migrations found.");
    } else {
      console.log(`Successfully ran ${migrations.length} migration(s):`);
      migrations.forEach((migration) => {
        console.log(`  - ${migration.name}`);
      });
    }

    console.log("Migration process completed successfully.");
    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error("Error running migrations:", error);
    process.exit(1);
  }
}

runMigrations();
