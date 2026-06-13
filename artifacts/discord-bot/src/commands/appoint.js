/**
 * /appoint command
 * Lets any user pick a member, then shows a dropdown of team roles.
 * Assigning the selected role to the chosen member.
 */

import {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  MessageFlags,
  ComponentType,
} from "discord.js";
import { getTeamRoleIds } from "../storage/teamRoles.js";

export const data = new SlashCommandBuilder()
  .setName("appoint")
  .setDescription("Appoint a member to a team role.")
  .addUserOption((option) =>
    option
      .setName("member")
      .setDescription("The member to appoint")
      .setRequired(true)
  );

/**
 * @param {import("discord.js").ChatInputCommandInteraction} interaction
 */
export async function execute(interaction) {
  const guild = interaction.guild;
  if (!guild) {
    return interaction.reply({
      content: "This command can only be used inside a server.",
      flags: MessageFlags.Ephemeral,
    });
  }

  // Fetch the currently saved team role IDs
  const teamRoleIds = getTeamRoleIds();

  if (teamRoleIds.length === 0) {
    return interaction.reply({
      content:
        "No team roles have been added yet. An administrator must first use `/add_team` to add roles.",
      flags: MessageFlags.Ephemeral,
    });
  }

  // Resolve each saved role ID to an actual Guild Role object
  // Filter out any IDs that no longer correspond to a real role
  const resolvedRoles = (
    await Promise.all(
      teamRoleIds.map((id) =>
        guild.roles.fetch(id).catch(() => null)
      )
    )
  ).filter(Boolean);

  if (resolvedRoles.length === 0) {
    return interaction.reply({
      content:
        "None of the saved team roles exist in this server anymore. Please re-add roles with `/add_team`.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const targetUser = interaction.options.getUser("member", true);

  // Build the dropdown with one option per team role
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId("appoint_role_select")
    .setPlaceholder("Select a team role to assign…")
    .addOptions(
      resolvedRoles.map((role) => ({
        label: role.name,
        value: role.id,
        description: `Assign the ${role.name} role`,
      }))
    );

  const row = new ActionRowBuilder().addComponents(selectMenu);

  // Reply with the dropdown — ephemeral so only the invoker sees it
  const response = await interaction.reply({
    content: `Select a team role to assign to **${targetUser.displayName ?? targetUser.username}**:`,
    components: [row],
    flags: MessageFlags.Ephemeral,
  });

  // Wait up to 60 seconds for the user to pick a role
  try {
    const selection = await response.awaitMessageComponent({
      componentType: ComponentType.StringSelect,
      filter: (i) => i.user.id === interaction.user.id,
      time: 60_000,
    });

    const selectedRoleId = selection.values[0];
    const selectedRole = resolvedRoles.find((r) => r.id === selectedRoleId);

    if (!selectedRole) {
      return selection.update({
        content: "Could not find the selected role. Please try again.",
        components: [],
      });
    }

    // Fetch the GuildMember object for the target user
    const member = await guild.members.fetch(targetUser.id).catch(() => null);

    if (!member) {
      return selection.update({
        content: `Could not find **${targetUser.username}** in this server.`,
        components: [],
      });
    }

    // Assign the role (bot needs Manage Roles permission and its own role must
    // be higher in the hierarchy than the role it's assigning)
    await member.roles.add(selectedRole, `Appointed via /appoint by ${interaction.user.tag}`);

    // Send a public confirmation in the channel
    await interaction.channel?.send({
      content: `**${member.displayName}** has been appointed to **${selectedRole.name}** by ${interaction.user}.`,
    });

    // Update the ephemeral reply to confirm
    return selection.update({
      content: `Done! **${member.displayName}** has been given the **${selectedRole.name}** role.`,
      components: [],
    });
  } catch (err) {
    // awaitMessageComponent throws if the timeout is hit
    if (err.code === "InteractionCollectorError") {
      return interaction.editReply({
        content: "Role selection timed out. Please run `/appoint` again.",
        components: [],
      });
    }

    console.error("Error in /appoint role assignment:", err);
    return interaction.editReply({
      content:
        "An error occurred while assigning the role. Make sure the bot has the **Manage Roles** permission and its role is above the target role in the hierarchy.",
      components: [],
    });
  }
}
