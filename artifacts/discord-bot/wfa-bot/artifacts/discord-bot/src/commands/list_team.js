/**
 * /list_team command  (everyone)
 * Shows all registered teams with their name, owner, and optional image.
 */

import {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import { getTeams } from "../storage/teamRoles.js";

export const data = new SlashCommandBuilder()
  .setName("list_team")
  .setDescription("Show all registered teams.");

/** @param {import("discord.js").ChatInputCommandInteraction} interaction */
export async function execute(interaction) {
  const teams = getTeams();

  if (teams.length === 0) {
    return interaction.reply({
      content: "No teams have been added yet. An administrator can add one with `/add_team`.",
      flags: MessageFlags.Ephemeral,
    });
  }

  await interaction.deferReply();

  const guild = interaction.guild;

  // Resolve each team's role and owner concurrently
  const resolved = await Promise.all(
    teams.map(async (team) => {
      const role  = await guild.roles.fetch(team.roleId).catch(() => null);
      return { team, role };
    })
  );

  const embed = new EmbedBuilder()
    .setTitle("📋 Team List")
    .setColor(0x5865f2)
    .setTimestamp();

  const lines = [];

  for (const { team, role } of resolved) {
    const name  = role ? role.name  : `Unknown role (${team.roleId})`;
    const owner = team.ownerId ? `<@${team.ownerId}>` : "None";
    lines.push(`**${name}**\nOwner: ${owner}\nMembers: ${team.memberIds.length}`);
  }

  embed.setDescription(lines.join("\n\n"));

  // If the first team has an image, use it as the embed thumbnail
  const firstWithImage = resolved.find((r) => r.team.imageUrl);
  if (firstWithImage) embed.setThumbnail(firstWithImage.team.imageUrl);

  return interaction.editReply({ embeds: [embed] });
}
