/**
 * /add_team command
 * Administrators only — adds a Discord role to the persistent team role list.
 */

import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} from "discord.js";
import { addTeamRole } from "../storage/teamRoles.js";

export const data = new SlashCommandBuilder()
  .setName("add_team")
  .setDescription("Add a role to the team role list (admin only).")
  .addRoleOption((option) =>
    option
      .setName("role")
      .setDescription("The role to add to the team list")
      .setRequired(true)
  )
  // Restrict visibility of the command to administrators by default
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

/**
 * @param {import("discord.js").ChatInputCommandInteraction} interaction
 */
export async function execute(interaction) {
  // Double-check permissions at runtime (defense-in-depth)
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({
      content: "You need the **Administrator** permission to use this command.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const role = interaction.options.getRole("role", true);

  const { added } = addTeamRole(role.id);

  if (!added) {
    return interaction.reply({
      content: `The role ${role} is **already** in the team list.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  return interaction.reply({
    content: `Successfully added ${role} to the team role list.`,
    flags: MessageFlags.Ephemeral,
  });
}
