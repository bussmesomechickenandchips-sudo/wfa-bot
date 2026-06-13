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

  // Build one embed per team (Discord allows up to 10 per message)
  const embeds = [];

  for (const team of teams) {
    const role  = await guild.roles.fetch(team.roleId).catch(() => null);
    const name  = role ? role.name : `Unknown Team (${team.roleId})`;
    const color = role?.color || 0x5865f2;
    const owner = team.ownerId ? `<@${team.ownerId}>` : "_No owner set_";

    const playerIds = team.memberIds.filter((id) => id !== team.ownerId);
    const players   = playerIds.length > 0
      ? playerIds.map((id) => `<@${id}>`).join("\n")
      : "_No players yet_";

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(name)
      .addFields(
        { name: "Owner", value: owner, inline: false },
        { name: "Players", value: players, inline: false }
      );

    if (team.imageUrl) embed.setThumbnail(team.imageUrl);

    embeds.push(embed);

    // Discord caps at 10 embeds per message — flush early if needed
    if (embeds.length === 10) break;
  }

  await interaction.editReply({ embeds });

  // If there are more than 10 teams, send the rest as follow-ups
  if (teams.length > 10) {
    const remaining = teams.slice(10);
    const extra = [];
    for (const team of remaining) {
      const role  = await guild.roles.fetch(team.roleId).catch(() => null);
      const name  = role ? role.name : `Unknown Team (${team.roleId})`;
      const color = role?.color || 0x5865f2;
      const owner = team.ownerId ? `<@${team.ownerId}>` : "_No owner set_";
      const playerIds = team.memberIds.filter((id) => id !== team.ownerId);
      const players   = playerIds.length > 0
        ? playerIds.map((id) => `<@${id}>`).join("\n")
        : "_No players yet_";

      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(name)
        .addFields(
          { name: "Owner", value: owner, inline: false },
          { name: "Players", value: players, inline: false }
        );

      if (team.imageUrl) embed.setThumbnail(team.imageUrl);
      extra.push(embed);

      if (extra.length === 10) {
        await interaction.followUp({ embeds: extra.splice(0) });
      }
    }
    if (extra.length > 0) await interaction.followUp({ embeds: extra });
  }
}
