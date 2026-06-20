/**
 * /roster_space command  (admin only)
 * Set or remove the maximum number of players allowed on a team roster.
 * The owner does not count toward the limit.
 */

import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder,
} from "discord.js";
import { getTeam, setRosterLimit } from "../storage/teamRoles.js";

export const data = new SlashCommandBuilder()
  .setName("roster_space")
  .setDescription("Set the maximum roster size for a team (admin only).")
  .addRoleOption((o) =>
    o.setName("team").setDescription("The team role to configure").setRequired(true)
  )
  .addIntegerOption((o) =>
    o
      .setName("limit")
      .setDescription("Max number of players (not counting the owner). Set 0 to remove the limit.")
      .setMinValue(0)
      .setMaxValue(100)
      .setRequired(true)
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

  const role  = interaction.options.getRole("team", true);
  const limit = interaction.options.getInteger("limit", true);

  if (!getTeam(role.id)) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xfee75c)
          .setTitle("Not Found")
          .setDescription(`**${role.name}** is not a registered team. Add it with \`/add_team\` first.`),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  // 0 means remove the limit
  const newLimit = limit === 0 ? null : limit;
  setRosterLimit(role.id, newLimit);

  if (newLimit === null) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle("Roster Limit Removed")
          .setDescription(`**${role.name}** now has **no roster limit** — unlimited players can be signed.`),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  return interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle("Roster Limit Set")
        .setDescription(`**${role.name}** can now have a maximum of **${newLimit} player(s)** (not counting the owner).`)
        .setFooter({ text: "Players over the limit cannot be signed until space opens up." }),
    ],
    flags: MessageFlags.Ephemeral,
  });
}
