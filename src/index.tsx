import { BotRuntime } from "./bot.tsx";
import { loadConfig } from "./config.ts";

const config = loadConfig();
const runtime = new BotRuntime(config);

runtime.start().catch((err) => {
  runtime.logger.error("startup", `Failed to log in: ${(err as Error).message}`);
  process.exit(1);
});

process.on("SIGINT", () => runtime.shutdown("SIGINT"));
process.on("SIGTERM", () => runtime.shutdown("SIGTERM"));
