/**
 * /appoint command  (admin only)
 * Lets an admin pick a member then choose a team role from a dropdown to assign.
 * Tracks the appointment in persistent storage and blocks double-signing.
 */

import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  MessageFlags,
  ComponentType,
} from "discord.js";
import { getTeams, addMemberToTeam, getUserTeam } from "../storage/teamRoles.js";

export const data = new SlashCommandBuilder()
  .setName("appoint")
  .setDescription("Appoint a member to a team role (admin only).")
  .addUserOption((o) =>
    o.setName("member").setDescription("The member to appoint").setRequired(true)
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

  const guild      = interaction.guild;
  const targetUser = interaction.options.getUser("member", true);

  // Block appointing someone already on a team
  const existingTeam = getUserTeam(targetUser.id);
  if (existingTeam) {
    const existingRole = guild.roles.cache.get(existingTeam.roleId);
    return interaction.reply({
      content: `**${targetUser.username}** is already on a team${existingRole ? ` (${existingRole.name})` : ""}. Release them first.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const teams = getTeams();
  if (teams.length === 0) {
    return interaction.reply({
      content: "No teams have been added yet. Use `/add_team` first.",
      flags: MessageFlags.Ephemeral,
    });
  }

  // Resolve role objects and build dropdown options
  const resolvedRoles = (
    await Promise.all(teams.map((t) => guild.roles.fetch(t.roleId).catch(() => null)))
  ).filter(Boolean);

  if (resolvedRoles.length === 0) {
    return interaction.reply({
      content: "No valid team roles found. Some roles may have been deleted.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId("appoint_role_select")
    .setPlaceholder("Select a team role…")
    .addOptions(
      resolvedRoles.map((role) => ({
        label: role.name,
        value: role.id,
        description: `Assign the ${role.name} role`,
      }))
    );

  const response = await interaction.reply({
    content: `Select a team role to assign to **${targetUser.displayName ?? targetUser.username}**:`,
    components: [new ActionRowBuilder().addComponents(selectMenu)],
    flags: MessageFlags.Ephemeral,
  });

  try {
    const selection = await response.awaitMessageComponent({
      componentType: ComponentType.StringSelect,
      filter: (i) => i.user.id === interaction.user.id,
      time: 60_000,
    });

    const selectedRole = resolvedRoles.find((r) => r.id === selection.values[0]);
    if (!selectedRole) {
      return selection.update({ content: "Could not find the selected role.", components: [] });
    }

    const member = await guild.members.fetch(targetUser.id).catch(() => null);
    if (!member) {
      return selection.update({
        content: `Could not find **${targetUser.username}** in this server.`,
        components: [],
      });
    }

    await member.roles.add(selectedRole, `Appointed via /appoint by ${interaction.user.tag}`);
    addMemberToTeam(selectedRole.id, targetUser.id);

    await interaction.channel?.send({
      content: `**${member.displayName}** has been appointed to **${selectedRole.name}** by ${interaction.user}.`,
    });

    return selection.update({
      content: `Done! **${member.displayName}** is now on **${selectedRole.name}**.`,
      components: [],
    });
  } catch (err) {
    if (err.code === "InteractionCollectorError") {
      return interaction.editReply({ content: "Selection timed out. Run `/appoint` again.", components: [] });
    }
    console.error("[/appoint] Error:", err);
    return interaction.editReply({
      content: "Failed to assign the role. Ensure the bot has **Manage Roles** and its role is above the target role.",
      components: [],
    });
  }
}
