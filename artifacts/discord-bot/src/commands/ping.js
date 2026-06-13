import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("ping")
  .setDescription("Check the bot's response time.");

/** @param {import("discord.js").ChatInputCommandInteraction} interaction */
export async function execute(interaction) {
  const sent = await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("Pong! 🏓")
        .setDescription("Calculating latency…"),
    ],
    withResponse: true,
  });

  const ms = sent.resource.message.createdTimestamp - interaction.createdTimestamp;

  await interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(ms < 200 ? 0x57f287 : ms < 500 ? 0xfee75c : 0xed4245)
        .setTitle("Pong! 🏓")
        .addFields({ name: "Latency", value: `${ms}ms`, inline: true }),
    ],
  });
}
