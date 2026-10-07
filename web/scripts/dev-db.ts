/**
 * Local throwaway MySQL for development when no MySQL is installed:
 * downloads MySQL, migrates, seeds, and prints a DATABASE_URL. Data is lost on exit.
 * Usage: npm run dev:db   (then put the printed URL in .env.local and run `npm run dev`)
 */
import { createDB } from "mysql-memory-server";

async function main() {
  const server = await createDB({ version: "8.4.x", logLevel: "ERROR", port: Number(process.env.DEV_DB_PORT ?? 3307) });
  const url = `mysql://${server.username}@127.0.0.1:${server.port}/${server.dbName}`;
  process.env.DATABASE_URL = url;
  const { runMigrations } = await import("./migrate");
  await runMigrations(url);
  const { seed } = await import("./seed");
  await seed();
  console.log(`\n✓ dev MySQL ready\nDATABASE_URL=${url}\n(Ctrl+C to stop — data is discarded)`);
  const stop = async () => {
    await server.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
