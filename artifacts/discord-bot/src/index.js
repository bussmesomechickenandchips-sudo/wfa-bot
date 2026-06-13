/**
 * Discord bot entry point.
 *
 * Loads all commands from src/commands/ and all events from src/events/,
 * then logs in using the DISCORD_TOKEN environment variable.
 *
 * Environment variables required (set in Replit Secrets):
 *   DISCORD_TOKEN      — bot token from the Discord Developer Portal
 *   DISCORD_CLIENT_ID  — application client ID (used by deploy-commands.js)
 *   DISCORD_GUILD_ID   — server ID where commands are registered
 */

import { Client, GatewayIntentBits, Collection } from "discord.js";
import { readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Validate required secrets ──────────────────────────────────────────────
const { DISCORD_TOKEN } = process.env;

if (!DISCORD_TOKEN) {
  console.error(
    "[Bot] DISCORD_TOKEN is not set. Add it in Replit Secrets and restart."
  );
  process.exit(1);
}

// ── Create client ──────────────────────────────────────────────────────────
// We only need Guilds intent for slash commands + role management.
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// Attach a commands Map to the client so event handlers can look up commands
client.commands = new Collection();

// ── Load commands ──────────────────────────────────────────────────────────
const commandsPath = join(__dirname, "commands");
const commandFiles = readdirSync(commandsPath).filter((f) => f.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = pathToFileURL(join(commandsPath, file)).href;
  const command = await import(filePath);

  if (command.data && command.execute) {
    client.commands.set(command.data.name, command);
    console.log(`[Bot] Loaded command: /${command.data.name}`);
  } else {
    console.warn(
      `[Bot] Skipped ${file} — missing "data" or "execute" export.`
    );
  }
}

// ── Load events ────────────────────────────────────────────────────────────
const eventsPath = join(__dirname, "events");
const eventFiles = readdirSync(eventsPath).filter((f) => f.endsWith(".js"));

for (const file of eventFiles) {
  const filePath = pathToFileURL(join(eventsPath, file)).href;
  const event = await import(filePath);

  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }

  console.log(`[Bot] Registered event: ${event.name} (once=${event.once})`);
}

// ── Log in ─────────────────────────────────────────────────────────────────
client.login(DISCORD_TOKEN).catch((err) => {
  console.error("[Bot] Failed to log in:", err.message);
  process.exit(1);
});
