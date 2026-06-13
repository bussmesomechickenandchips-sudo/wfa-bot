/**
 * /remove_team command
 * Administrators only — removes a Discord role from the persistent team role list.
 */

import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} from "discord.js";
import { removeTeamRole } from "../storage/teamRoles.js";

export const data = new SlashCommandBuilder()
  .setName("remove_team")
  .setDescription("Remove a role from the team role list (admin only).")
  .addRoleOption((option) =>
    option
      .setName("role")
      .setDescription("The role to remove from the team list")
      .setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

/**
 * @param {import("discord.js").ChatInputCommandInteraction} interaction
 */
export async function execute(interaction) {
  // Runtime permission guard
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({
      content: "You need the **Administrator** permission to use this command.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const role = interaction.options.getRole("role", true);

  const { removed } = removeTeamRole(role.id);

  if (!removed) {
    return interaction.reply({
      content: `The role ${role} is **not** in the team list.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  return interaction.reply({
    content: `Successfully removed ${role} from the team role list.`,
    flags: MessageFlags.Ephemeral,
  });
}
