/**
 * /ping command
 * Replies with Pong 🏓 and the round-trip latency in milliseconds.
 */

import { SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("ping")
  .setDescription("Check the bot's response time.");

/** @param {import("discord.js").ChatInputCommandInteraction} interaction */
export async function execute(interaction) {
  const sent = await interaction.reply({ content: "Pong 🏓", fetchReply: true });
  const ms = sent.createdTimestamp - interaction.createdTimestamp;

  await interaction.editReply(`Pong 🏓\n\nms: ${ms}`);
}
