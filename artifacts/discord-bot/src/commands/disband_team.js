/**
 * /disband_team command  (admin only)
 * Strips the team role from every current member but keeps the team in the list.
 */

import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} from "discord.js";
import { getTeam, disbandTeamMembers } from "../storage/teamRoles.js";

export const data = new SlashCommandBuilder()
  .setName("disband_team")
  .setDescription("Remove all members from a team without deleting it (admin only).")
  .addRoleOption((o) =>
    o.setName("role").setDescription("The team role to disband").setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

/** @param {import("discord.js").ChatInputCommandInteraction} interaction */
export async function execute(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({
      content: "You need the **Administrator** permission to use this command.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const role = interaction.options.getRole("role", true);

  if (!getTeam(role.id)) {
    return interaction.reply({
      content: `**${role.name}** is not a registered team. Add it with \`/add_team\` first.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const { cleared, memberIds } = disbandTeamMembers(role.id);

  if (!cleared || memberIds.length === 0) {
    return interaction.editReply({
      content: `**${role.name}** has no members to remove. The team remains in the list.`,
    });
  }

  // Strip the role from every member that was tracked
  const guild = interaction.guild;
  let successCount = 0;
  let failCount = 0;

  await Promise.all(
    memberIds.map(async (userId) => {
      try {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (member) {
          await member.roles.remove(role, `Team disbanded by ${interaction.user.tag}`);
        }
        successCount++;
      } catch {
        failCount++;
      }
    })
  );

  return interaction.editReply({
    content:
      `**${role.name}** has been disbanded.\n` +
      `Removed from **${successCount}** member(s)${failCount > 0 ? ` (${failCount} failed — they may have already left)` : ""}.\n` +
      `The team is still in the list and can be restaffed.`,
  });
}
