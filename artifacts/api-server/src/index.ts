import app from "./app";
import { logger } from "./lib/logger";
import { spawn } from "node:child_process";
import { join } from "node:path";

// In production the bot has no dedicated workflow, so the api-server owns it.
// In development the "Discord Bot" workflow handles it separately.
if (process.env["NODE_ENV"] === "production") {
  const botEntry = join(process.cwd(), "artifacts/discord-bot/src/index.js");
  const bot = spawn("node", ["--enable-source-maps", botEntry], {
    env: process.env,
    stdio: ["ignore", "inherit", "inherit"],
  });
  bot.on("exit", (code, signal) => {
    logger.warn({ code, signal }, "Discord bot exited");
  });
  bot.on("error", (err) => {
    logger.error({ err }, "Discord bot failed to start");
  });
  logger.info({ botEntry }, "Discord bot process started");
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
