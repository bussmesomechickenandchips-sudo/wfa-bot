/**
 * /add_team command  (admin only)
 * Adds a Discord role to the team list.
 */

import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} from "discord.js";
import { addTeam, getTeam } from "../storage/teamRoles.js";

export const data = new SlashCommandBuilder()
  .setName("add_team")
  .setDescription("Add a role to the team list (admin only).")
  .addRoleOption((o) =>
    o.setName("role").setDescription("The team role to add").setRequired(true)
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

  if (getTeam(role.id)) {
    return interaction.reply({
      content: `The role ${role} is **already** in the team list.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  addTeam(role.id);

  return interaction.reply({
    content: `Successfully added **${role.name}** to the team list.`,
    flags: MessageFlags.Ephemeral,
  });
}
