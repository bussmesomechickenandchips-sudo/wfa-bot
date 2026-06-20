import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import { getTeams } from "../storage/teamRoles.js";

export const data = new SlashCommandBuilder()
  .setName("roster")
  .setDescription("Show all teams and their current rosters.");

/** @param {import("discord.js").ChatInputCommandInteraction} interaction */
export async function execute(interaction) {
  const teams = getTeams();

  if (teams.length === 0) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xfee75c)
          .setTitle("No Teams")
          .setDescription("No teams have been set up yet."),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  await interaction.deferReply();

  const guild = interaction.guild;

  // Resolve all team roles concurrently
  const resolved = await Promise.all(
    teams.map(async (team) => {
      const role = await guild.roles.fetch(team.roleId).catch(() => null);
      return { team, role };
    })
  );

  // Build description lines like the list_team style
  const lines = [];
  for (const { team, role } of resolved) {
    const name    = role ? `**${role.name}**` : `**Unknown Team** (${team.roleId})`;
    const owner   = team.ownerId ? `<@${team.ownerId}>` : "None";
    const players = team.memberIds.filter((id) => id !== team.ownerId);
    const limitText = team.rosterLimit != null ? `/${team.rosterLimit}` : "";
    const memberCount = `${players.length}${limitText}`;

    const playerList = players.length > 0
      ? players.map((id) => `<@${id}>`).join(", ")
      : "_No players yet_";

    lines.push(
      `${name}\n` +
      `Owner: ${owner}\n` +
      `Members: ${memberCount}\n` +
      `Players: ${playerList}`
    );
  }

  // Split into multiple embeds if description would exceed 4096 chars
  const embeds = [];
  let current = "";

  for (const line of lines) {
    if (current.length + line.length + 2 > 4000) {
      embeds.push(
        new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle(embeds.length === 0 ? "📋 Roster" : "📋 Roster (cont.)")
          .setDescription(current.trimEnd())
          .setTimestamp(embeds.length === 0 ? new Date() : undefined)
      );
      current = line + "\n\n";
    } else {
      current += line + "\n\n";
    }
  }
  if (current.trim()) {
    embeds.push(
      new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(embeds.length === 0 ? "📋 Roster" : "📋 Roster (cont.)")
        .setDescription(current.trimEnd())
        .setTimestamp(embeds.length === 0 ? new Date() : undefined)
    );
  }

  await interaction.editReply({ embeds: [embeds[0]] });
  for (let i = 1; i < embeds.length; i++) {
    await interaction.followUp({ embeds: [embeds[i]] });
  }
}
