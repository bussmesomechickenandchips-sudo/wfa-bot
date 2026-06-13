/**
 * "interactionCreate" event handler.
 * Routes incoming slash command interactions to their respective handlers.
 */

import { MessageFlags } from "discord.js";

export const name = "interactionCreate";
export const once = false;

/**
 * @param {import("discord.js").Interaction} interaction
 */
export async function execute(interaction) {
  // Only handle slash (chat input) commands
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    console.warn(`[Bot] Unknown command: ${interaction.commandName}`);
    return interaction.reply({
      content: "Unknown command.",
      flags: MessageFlags.Ephemeral,
    });
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`[Bot] Error executing /${interaction.commandName}:`, error);

    // Reply (or follow up) with a generic error — avoids leaving an unacknowledged interaction
    const errorPayload = {
      content: "An unexpected error occurred while running this command.",
      flags: MessageFlags.Ephemeral,
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorPayload).catch(console.error);
    } else {
      await interaction.reply(errorPayload).catch(console.error);
    }
  }
}
