/**
 * /roster command  (everyone)
 * Displays all teams with their owner and current player roster.
 *
 * Format:
 *   WFA | Arsenal
 *   Owner — @mention
 *
 *   Players:
 *   @mention
 *   ...
 *
 *   ────────────────────────
 */

import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { getTeams } from "../storage/teamRoles.js";

const DIVIDER = "─".repeat(40);

export const data = new SlashCommandBuilder()
  .setName("roster")
  .setDescription("Show all teams and their current rosters.");

/** @param {import("discord.js").ChatInputCommandInteraction} interaction */
export async function execute(interaction) {
  const teams = getTeams();

  if (teams.length === 0) {
    return interaction.reply({
      content: "No teams have been set up yet.",
      flags: MessageFlags.Ephemeral,
    });
  }

  await interaction.deferReply();

  const guild   = interaction.guild;
  const chunks  = []; // We may need multiple messages if roster is long

  for (const team of teams) {
    const role  = await guild.roles.fetch(team.roleId).catch(() => null);
    const name  = role ? role.name : `Unknown Team (${team.roleId})`;
    const owner = team.ownerId ? `<@${team.ownerId}>` : "No owner set";

    // Players = members excluding the owner
    const playerIds = team.memberIds.filter((id) => id !== team.ownerId);
    const playerLines =
      playerIds.length > 0
        ? playerIds.map((id) => `<@${id}>`).join("\n")
        : "_No players yet_";

    const block =
      `**${name}**\n` +
      `Owner — ${owner}\n\n` +
      `Players:\n` +
      `${playerLines}\n\n` +
      `${DIVIDER}`;

    chunks.push(block);
  }

  // Discord messages have a 2000-char limit — split if necessary
  const messages = [];
  let current    = "";

  for (const chunk of chunks) {
    if (current.length + chunk.length + 2 > 1990) {
      messages.push(current.trimEnd());
      current = chunk + "\n\n";
    } else {
      current += chunk + "\n\n";
    }
  }
  if (current.trim()) messages.push(current.trimEnd());

  // Send the first as editReply, the rest as followUps
  await interaction.editReply({ content: messages[0] });
  for (let i = 1; i < messages.length; i++) {
    await interaction.followUp({ content: messages[i] });
  }
}
