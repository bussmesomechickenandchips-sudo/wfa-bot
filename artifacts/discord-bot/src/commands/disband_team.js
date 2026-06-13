import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder,
} from "discord.js";
import { getTeam, disbandTeamMembers } from "../storage/teamRoles.js";
import { MANAGER_ROLE_ID } from "../config.js";

export const data = new SlashCommandBuilder()
  .setName("disband_team")
  .setDescription("Remove all members & owner from a team without deleting it (admin only).")
  .addRoleOption((o) =>
    o.setName("role").setDescription("The team role to disband").setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

/** @param {import("discord.js").ChatInputCommandInteraction} interaction */
export async function execute(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("Permission Denied")
          .setDescription("You need the **Administrator** permission to use this command."),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  const teamRole = interaction.options.getRole("role", true);

  if (!getTeam(teamRole.id)) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xfee75c)
          .setTitle("Not Found")
          .setDescription(`**${teamRole.name}** is not a registered team.`),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const guild = interaction.guild;
  const managerRole = await guild.roles.fetch(MANAGER_ROLE_ID).catch(() => null);
  const { memberIds, ownerId } = disbandTeamMembers(teamRole.id);

  let removedCount = 0;
  let failCount = 0;

  await Promise.all(
    memberIds.map(async (userId) => {
      if (userId === ownerId) return;
      try {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (member) {
          await member.roles.remove(teamRole, `Team disbanded by ${interaction.user.tag}`);
        }
        removedCount++;
      } catch {
        failCount++;
      }
    })
  );

  if (ownerId) {
    try {
      const owner = await guild.members.fetch(ownerId).catch(() => null);
      if (owner) {
        const rolesToRemove = [teamRole];
        if (managerRole) rolesToRemove.push(managerRole);
        await owner.roles.remove(rolesToRemove, `Team disbanded by ${interaction.user.tag}`);
        removedCount++;
      }
    } catch {
      failCount++;
    }
  }

  const hadAnyone = ownerId || memberIds.length > 0;

  return interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("Team Disbanded")
        .setDescription(`**${teamRole.name}** has been disbanded.`)
        .addFields(
          {
            name: "Members Cleared",
            value: hadAnyone
              ? `**${removedCount}** person(s) removed${failCount > 0 ? ` (${failCount} failed)` : ""}`
              : "The team had no members or owner assigned.",
            inline: false,
          },
          {
            name: "Note",
            value: "The team is still in the list and can be restaffed with `/appoint`.",
            inline: false,
          }
        )
        .setTimestamp(),
    ],
  });
}
