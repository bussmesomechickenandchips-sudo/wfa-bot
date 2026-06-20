import {
  SlashCommandBuilder,
  MessageFlags,
  EmbedBuilder,
} from "discord.js";
import { getUserTeam, removeMemberFromTeam } from "../storage/teamRoles.js";
import { RELEASE_LOG_CHANNEL_ID } from "../config.js";

export const data = new SlashCommandBuilder()
  .setName("release")
  .setDescription("Leave your current team.");

/** @param {import("discord.js").ChatInputCommandInteraction} interaction */
export async function execute(interaction) {
  const userId = interaction.user.id;
  const guild  = interaction.guild;

  const team = getUserTeam(userId);
  if (!team) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xfee75c)
          .setTitle("Not on a Team")
          .setDescription("You are not currently on any team."),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  const teamRole = await guild.roles.fetch(team.roleId).catch(() => null);

  const member = await guild.members.fetch(userId).catch(() => null);
  if (member && teamRole) {
    await member.roles.remove(teamRole, "Self-released via /release").catch(console.error);
  }

  removeMemberFromTeam(team.roleId, userId);

  const roleName = teamRole?.name ?? "your team";

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle("Released")
        .setDescription(`You have been released from **${roleName}**.`),
    ],
    flags: MessageFlags.Ephemeral,
  });

  const releaseChannel = await interaction.client.channels.fetch(RELEASE_LOG_CHANNEL_ID).catch(() => null);
  await releaseChannel?.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("Player Released")
        .setDescription(`<@${userId}> has left **${roleName}**.`)
        .setTimestamp(),
    ],
  });
}
