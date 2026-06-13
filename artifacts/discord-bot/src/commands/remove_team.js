/**
 * /remove_team command  (admin only)
 * Permanently removes a team from the list (does NOT strip the role from members).
 */

import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} from "discord.js";
import { removeTeam } from "../storage/teamRoles.js";

export const data = new SlashCommandBuilder()
  .setName("remove_team")
  .setDescription("Remove a team from the team list (admin only).")
  .addRoleOption((o) =>
    o.setName("role").setDescription("The team role to remove").setRequired(true)
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
  const { removed } = removeTeam(role.id);

  if (!removed) {
    return interaction.reply({
      content: `The role ${role} is **not** in the team list.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  return interaction.reply({
    content: `Successfully removed **${role.name}** from the team list.`,
    flags: MessageFlags.Ephemeral,
  });
}
