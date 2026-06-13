/**
 * /sign command  (team owners only)
 * Sends a DM to a player offering them a spot on the owner's team.
 * The player gets Accept / Reject buttons. Only works if the player
 * is not already on another team.
 */

import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ComponentType,
  EmbedBuilder,
} from "discord.js";
import {
  getTeamByOwner,
  getUserTeam,
  addMemberToTeam,
} from "../storage/teamRoles.js";

export const data = new SlashCommandBuilder()
  .setName("sign")
  .setDescription("Offer a player a spot on your team (team owners only).")
  .addUserOption((o) =>
    o.setName("player").setDescription("The player to sign").setRequired(true)
  );

/** @param {import("discord.js").ChatInputCommandInteraction} interaction */
export async function execute(interaction) {
  const guild      = interaction.guild;
  const signerUser = interaction.user;

  // ── 1. Check the command runner owns a team ───────────────────────────────
  const team = getTeamByOwner(signerUser.id);
  if (!team) {
    return interaction.reply({
      content: "You do not own a team. Only team owners can use `/sign`.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const teamRole = await guild.roles.fetch(team.roleId).catch(() => null);
  if (!teamRole) {
    return interaction.reply({
      content: "Your team's role no longer exists. Please contact an administrator.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const targetUser = interaction.options.getUser("player", true);

  // Can't sign yourself
  if (targetUser.id === signerUser.id) {
    return interaction.reply({
      content: "You cannot sign yourself.",
      flags: MessageFlags.Ephemeral,
    });
  }

  // ── 2. Check the target isn't already on a team ───────────────────────────
  const existingTeam = getUserTeam(targetUser.id);
  if (existingTeam) {
    const existingRole = guild.roles.cache.get(existingTeam.roleId);
    return interaction.reply({
      content: `**${targetUser.username}** is already on a team${existingRole ? ` (**${existingRole.name}**)` : ""}. They must \`/release\` first.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  // ── 3. Defer + send the DM ────────────────────────────────────────────────
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const acceptBtn = new ButtonBuilder()
    .setCustomId("sign_accept")
    .setLabel("✅  Accept")
    .setStyle(ButtonStyle.Success);

  const rejectBtn = new ButtonBuilder()
    .setCustomId("sign_reject")
    .setLabel("❌  Reject")
    .setStyle(ButtonStyle.Danger);

  const row = new ActionRowBuilder().addComponents(acceptBtn, rejectBtn);

  const offerEmbed = new EmbedBuilder()
    .setColor(teamRole.color || 0x5865f2)
    .setTitle("🏆 Team Offer")
    .setDescription(
      `**${teamRole.name}** has offered to sign you!\n\n` +
      `Offered by: <@${signerUser.id}>\n\n` +
      `Do you accept?`
    )
    .setFooter({ text: "This offer expires in 10 minutes." });

  if (team.imageUrl) offerEmbed.setThumbnail(team.imageUrl);

  let dmMessage;
  try {
    const dmChannel = await targetUser.createDM();
    dmMessage = await dmChannel.send({ embeds: [offerEmbed], components: [row] });
  } catch {
    return interaction.editReply({
      content: `Could not send a DM to **${targetUser.username}**. They may have DMs disabled.`,
    });
  }

  await interaction.editReply({
    content: `Offer sent to **${targetUser.username}**. Waiting for their response (10 min timeout)…`,
  });

  // ── 4. Wait for the player's response ─────────────────────────────────────
  try {
    const btnInteraction = await dmMessage.awaitMessageComponent({
      componentType: ComponentType.Button,
      filter: (i) => i.user.id === targetUser.id,
      time: 600_000, // 10 minutes
    });

    if (btnInteraction.customId === "sign_accept") {
      // Assign the team role to the player
      const member = await guild.members.fetch(targetUser.id).catch(() => null);

      if (!member) {
        await btnInteraction.update({
          embeds: [],
          content: "Could not find you in the server. The offer has been cancelled.",
          components: [],
        });
        return interaction.editReply({
          content: `**${targetUser.username}** accepted but could not be found in the server.`,
        });
      }

      await member.roles.add(teamRole, `Signed by team owner ${signerUser.tag}`);
      addMemberToTeam(team.roleId, targetUser.id);

      // Confirm in DM
      await btnInteraction.update({
        embeds: [],
        content: `You have accepted the offer and joined **${teamRole.name}**! Welcome to the team.`,
        components: [],
      });

      // Public announcement in the channel where /sign was run
      await interaction.channel?.send({
        content: `📝 **${member.displayName}** has been signed to **${teamRole.name}**!`,
      });

      // Update the original reply
      return interaction.editReply({
        content: `✅ **${targetUser.username}** accepted and has been added to **${teamRole.name}**.`,
      });
    } else {
      // Player rejected
      await btnInteraction.update({
        embeds: [],
        content: `You have rejected the offer from **${teamRole.name}**.`,
        components: [],
      });

      return interaction.editReply({
        content: `**${targetUser.username}** rejected your offer.`,
      });
    }
  } catch (err) {
    // Timeout — disable the buttons in the DM
    await dmMessage
      .edit({
        embeds: [],
        content: `The offer from **${teamRole.name}** has expired.`,
        components: [],
      })
      .catch(() => null);

    return interaction.editReply({
      content: `**${targetUser.username}** did not respond in time. The offer has expired.`,
    });
  }
}
