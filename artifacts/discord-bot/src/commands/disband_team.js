/**
 * /disband_team command  (admin only)
 *
 * Strips the team role from every player, removes the WFA | Manager role
 * and team role from the owner, clears the owner record, and empties the
 * member list — but keeps the team in the registered list.
 */

import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
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
      content: "You need the **Administrator** permission to use this command.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const teamRole = interaction.options.getRole("role", true);

  if (!getTeam(teamRole.id)) {
    return interaction.reply({
      content: `**${teamRole.name}** is not a registered team.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const guild = interaction.guild;

  // Fetch the WFA | Manager role so we can strip it from the owner
  const managerRole = await guild.roles.fetch(MANAGER_ROLE_ID).catch(() => null);

  // Clear storage and get who was on the team
  const { memberIds, ownerId } = disbandTeamMembers(teamRole.id);

  let removedCount = 0;
  let failCount = 0;

  // ── Remove team role from all signed players ───────────────────────────────
  await Promise.all(
    memberIds.map(async (userId) => {
      // Skip the owner here — handled separately below
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

  // ── Remove team role AND manager role from the owner ──────────────────────
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
    content:
      `**${teamRole.name}** has been disbanded.\n` +
      (hadAnyone
        ? `Cleared **${removedCount}** person(s) from the team${failCount > 0 ? ` (${failCount} failed)` : ""}.`
        : "The team had no members or owner assigned.") +
      `\nThe team is still in the list and can be restaffed.`,
  });
}
