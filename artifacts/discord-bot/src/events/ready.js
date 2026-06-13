/**
 * "ready" event handler — fired once when the bot successfully logs in.
 */

export const name = "clientReady";
export const once = true;

/**
 * @param {import("discord.js").Client} client
 */
export function execute(client) {
  console.log(`[Bot] Logged in as ${client.user?.tag} and ready.`);
}
