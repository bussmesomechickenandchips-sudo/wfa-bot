/**
 * Command deployment script.
 *
 * Registers all slash commands with Discord for a specific guild (server).
 * Run once (or after any command changes):
 *
 *   node src/deploy-commands.js
 *
 * Uses guild-scoped registration so commands appear instantly (no 1-hour delay).
 * For global registration, replace the guild endpoint with the global one.
 *
 * Required environment variables (set in Replit Secrets):
 *   DISCORD_TOKEN      — bot token
 *   DISCORD_CLIENT_ID  — application client ID
 *   DISCORD_GUILD_ID   — target guild/server ID
 */

import { REST, Routes } from "discord.js";
import { readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const { DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID } = process.env;

if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID || !DISCORD_GUILD_ID) {
  console.error(
    "[Deploy] Missing one or more required secrets:\n" +
      "  DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID\n" +
      "Add them in Replit Secrets, then re-run this script."
  );
  process.exit(1);
}

// Collect all command definitions
const commandsPath = join(__dirname, "commands");
const commandFiles = readdirSync(commandsPath).filter((f) => f.endsWith(".js"));

const commands = [];

for (const file of commandFiles) {
  const filePath = pathToFileURL(join(commandsPath, file)).href;
  const command = await import(filePath);
  if (command.data) {
    commands.push(command.data.toJSON());
    console.log(`[Deploy] Queued command: /${command.data.name}`);
  }
}

// Push commands to Discord via the REST API
const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

console.log(`[Deploy] Registering ${commands.length} command(s) to guild ${DISCORD_GUILD_ID}…`);

try {
  const data = await rest.put(
    Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID),
    { body: commands }
  );

  console.log(`[Deploy] Successfully registered ${data.length} guild command(s).`);
} catch (error) {
  console.error("[Deploy] Failed to register commands:", error);
  process.exit(1);
}
