import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder,
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

  if (getTeam(role.id)) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xfee75c)
          .setTitle("Already Registered")
          .setDescription(`${role} is **already** in the team list.`),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  addTeam(role.id);

  return interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle("Team Added")
        .setDescription(`**${role.name}** has been added to the team list.`),
    ],
    flags: MessageFlags.Ephemeral,
  });
}
