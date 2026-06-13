import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder,
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
      embeds: [
        new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("Permission Denied")
          .setDescription("You need the **Administrator** permission to use this command."),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  const role = interaction.options.getRole("role", true);
  const { removed } = removeTeam(role.id);

  if (!removed) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xfee75c)
          .setTitle("Not Found")
          .setDescription(`${role} is **not** in the team list.`),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  return interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle("Team Removed")
        .setDescription(`**${role.name}** has been removed from the team list.`),
    ],
    flags: MessageFlags.Ephemeral,
  });
}
