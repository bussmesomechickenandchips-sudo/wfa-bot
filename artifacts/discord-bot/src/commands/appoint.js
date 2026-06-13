/**
 * /appoint command  (admin only)
 *
 * Appoints a member as the owner of a selected team.
 *   1. Shows a dropdown of all registered teams.
 *   2. Assigns the "WFA | Manager" badge role to the appointed person.
 *   3. Records them as the team's owner in persistent storage.
 *
 * The team's own specific role is NOT given here — that is reserved for
 * players who are signed via /sign.
 */

import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  MessageFlags,
  ComponentType,
} from "discord.js";
import { getTeams, setTeamOwner } from "../storage/teamRoles.js";
import { MANAGER_ROLE_ID } from "../config.js";

export const data = new SlashCommandBuilder()
  .setName("appoint")
  .setDescription("Appoint a member as a team owner (admin only).")
  .addUserOption((o) =>
    o.setName("member").setDescription("The member to appoint as team owner").setRequired(true)
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

  // Verify the WFA | Manager role exists in this server
  const managerRole = await guild.roles.fetch(MANAGER_ROLE_ID).catch(() => null);
  if (!managerRole) {
    return interaction.reply({
      content: `Could not find the **WFA | Manager** role (ID: \`${MANAGER_ROLE_ID}\`). Make sure it exists in this server.`,
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

  // Resolve team role names for the dropdown
  const resolvedRoles = (
    await Promise.all(teams.map((t) => guild.roles.fetch(t.roleId).catch(() => null)))
  ).filter(Boolean);

  if (resolvedRoles.length === 0) {
    return interaction.reply({
      content: "No valid team roles found. Some may have been deleted.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId("appoint_team_select")
    .setPlaceholder("Select which team to appoint them to…")
    .addOptions(
      resolvedRoles.map((role) => ({
        label: role.name,
        value: role.id,
        description: `Appoint ${targetUser.username} as owner of ${role.name}`,
      }))
    );

  const response = await interaction.reply({
    content: `Which team should **${targetUser.displayName ?? targetUser.username}** manage?`,
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

    // Give both the WFA | Manager badge and the team's own role
    await member.roles.add(
      [managerRole, selectedRole],
      `Appointed as manager of ${selectedRole.name} by ${interaction.user.tag}`
    );

    // Record as team owner in storage
    setTeamOwner(selectedRole.id, targetUser.id);

    // Public announcement
    await interaction.channel?.send({
      content: `**${member.displayName}** has been appointed as the manager of **${selectedRole.name}**!`,
    });

    return selection.update({
      content: `Done! **${member.displayName}** is now the manager of **${selectedRole.name}** and can use \`/sign\` to recruit players.`,
      components: [],
    });
  } catch (err) {
    if (err.code === "InteractionCollectorError") {
      return interaction.editReply({ content: "Selection timed out. Run `/appoint` again.", components: [] });
    }
    console.error("[/appoint] Error:", err);
    return interaction.editReply({
      content: "Failed to assign the role. Ensure the bot has **Manage Roles** and its role is above **WFA | Manager** in the hierarchy.",
      components: [],
    });
  }
}
