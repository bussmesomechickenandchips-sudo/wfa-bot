/**
 * /add_team command  (admin only)
 * Adds a Discord role to the team list with an optional image URL and owner.
 */

import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder,
} from "discord.js";
import { addTeam, setTeamImage, getTeam } from "../storage/teamRoles.js";

export const data = new SlashCommandBuilder()
  .setName("add_team")
  .setDescription("Add a role to the team list (admin only).")
  .addRoleOption((o) =>
    o.setName("role").setDescription("The team role").setRequired(true)
  )
  .addUserOption((o) =>
    o.setName("owner").setDescription("The team owner (optional)").setRequired(false)
  )
  .addStringOption((o) =>
    o
      .setName("image")
      .setDescription("Image URL to display alongside this team (optional)")
      .setRequired(false)
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

  const role     = interaction.options.getRole("role", true);
  const owner    = interaction.options.getUser("owner");
  const imageUrl = interaction.options.getString("image");

  // Validate the image URL if provided
  if (imageUrl) {
    try {
      const url = new URL(imageUrl);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    } catch {
      return interaction.reply({
        content: "The image URL you provided is not valid. Please use a full `https://` URL.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }

  const existing = getTeam(role.id);

  if (existing) {
    // Team already exists — update image if a new one was supplied
    if (imageUrl) {
      setTeamImage(role.id, imageUrl);
      return interaction.reply({
        content: `**${role.name}** is already in the team list. Its image has been updated.`,
        flags: MessageFlags.Ephemeral,
      });
    }
    return interaction.reply({
      content: `The role ${role} is **already** in the team list.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  addTeam(role.id, {
    ownerId:  owner?.id  ?? null,
    imageUrl: imageUrl   ?? null,
  });

  const embed = new EmbedBuilder()
    .setColor(role.color || 0x5865f2)
    .setTitle(`✅ Team added: ${role.name}`)
    .addFields(
      { name: "Role",  value: `${role}`,                                inline: true },
      { name: "Owner", value: owner ? `${owner}` : "None set",          inline: true }
    );

  if (imageUrl) embed.setThumbnail(imageUrl);

  return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
