import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  MessageFlags,
  ComponentType,
  EmbedBuilder,
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
      embeds: [
        new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("Permission Denied")
          .setDescription("You need the **Administrator** permission to use this command."),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  const guild      = interaction.guild;
  const targetUser = interaction.options.getUser("member", true);

  const managerRole = await guild.roles.fetch(MANAGER_ROLE_ID).catch(() => null);
  if (!managerRole) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("Role Not Found")
          .setDescription(`Could not find the **WFA | Manager** role (ID: \`${MANAGER_ROLE_ID}\`). Make sure it exists in this server.`),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  const teams = getTeams();
  if (teams.length === 0) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xfee75c)
          .setTitle("No Teams")
          .setDescription("No teams have been added yet. Use `/add_team` first."),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  const resolvedRoles = (
    await Promise.all(teams.map((t) => guild.roles.fetch(t.roleId).catch(() => null)))
  ).filter(Boolean);

  if (resolvedRoles.length === 0) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("No Valid Roles")
          .setDescription("No valid team roles found. Some may have been deleted."),
      ],
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
    embeds: [
      new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("Select a Team")
        .setDescription(`Which team should **${targetUser.displayName ?? targetUser.username}** manage?`),
    ],
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
      return selection.update({
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle("Error")
            .setDescription("Could not find the selected role."),
        ],
        components: [],
      });
    }

    const member = await guild.members.fetch(targetUser.id).catch(() => null);
    if (!member) {
      return selection.update({
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle("Member Not Found")
            .setDescription(`Could not find **${targetUser.username}** in this server.`),
        ],
        components: [],
      });
    }

    await member.roles.add(
      [managerRole, selectedRole],
      `Appointed as manager of ${selectedRole.name} by ${interaction.user.tag}`
    );

    setTeamOwner(selectedRole.id, targetUser.id);

    await interaction.channel?.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xffd700)
          .setTitle("Manager Appointed")
          .setDescription(`<@${member.id}> has been appointed as the manager of **${selectedRole.name}**!`)
          .setTimestamp(),
      ],
    });

    return selection.update({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle("Done!")
          .setDescription(`**${member.displayName}** is now the manager of **${selectedRole.name}** and can use \`/sign\` to recruit players.`),
      ],
      components: [],
    });
  } catch (err) {
    if (err.code === "InteractionCollectorError") {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xfee75c)
            .setTitle("Timed Out")
            .setDescription("Selection timed out. Run `/appoint` again."),
        ],
        components: [],
      });
    }
    console.error("[/appoint] Error:", err);
    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("Failed")
          .setDescription("Failed to assign the role. Ensure the bot has **Manage Roles** and its role is above **WFA | Manager** in the hierarchy."),
      ],
      components: [],
    });
  }
}
