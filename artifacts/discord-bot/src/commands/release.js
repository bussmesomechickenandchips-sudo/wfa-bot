/**
 * /release command  (players only — any member currently on a team)
 * Lets a player voluntarily leave their current team.
 */

import {
  SlashCommandBuilder,
  MessageFlags,
} from "discord.js";
import { getUserTeam, removeMemberFromTeam } from "../storage/teamRoles.js";

export const data = new SlashCommandBuilder()
  .setName("release")
  .setDescription("Leave your current team.");

/** @param {import("discord.js").ChatInputCommandInteraction} interaction */
export async function execute(interaction) {
  const userId = interaction.user.id;
  const guild  = interaction.guild;

  // Check the player is actually on a team
  const team = getUserTeam(userId);
  if (!team) {
    return interaction.reply({
      content: "You are not currently on any team.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const teamRole = await guild.roles.fetch(team.roleId).catch(() => null);

  // Remove the role from the guild member
  const member = await guild.members.fetch(userId).catch(() => null);
  if (member && teamRole) {
    await member.roles
      .remove(teamRole, `Self-released via /release`)
      .catch(console.error);
  }

  // Remove from storage
  removeMemberFromTeam(team.roleId, userId);

  const roleName = teamRole?.name ?? "your team";

  // Ephemeral confirmation to the player
  await interaction.reply({
    content: `You have been released from **${roleName}**.`,
    flags: MessageFlags.Ephemeral,
  });

  // Public notice in the channel
  await interaction.channel?.send({
    content: `**${interaction.user.username}** has left **${roleName}**.`,
  });
}
