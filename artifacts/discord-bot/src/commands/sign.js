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
import { SIGN_LOG_CHANNEL_ID } from "../config.js";

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

  const team = getTeamByOwner(signerUser.id);
  if (!team) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("Not a Team Owner")
          .setDescription("You do not own a team. Only team owners can use `/sign`."),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  const teamRole = await guild.roles.fetch(team.roleId).catch(() => null);
  if (!teamRole) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("Role Missing")
          .setDescription("Your team's role no longer exists. Please contact an administrator."),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  const targetUser = interaction.options.getUser("player", true);

  if (targetUser.id === signerUser.id) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xfee75c)
          .setTitle("Invalid Target")
          .setDescription("You cannot sign yourself."),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  const existingTeam = getUserTeam(targetUser.id);
  if (existingTeam) {
    const existingRole = guild.roles.cache.get(existingTeam.roleId);
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xfee75c)
          .setTitle("Already on a Team")
          .setDescription(
            `**${targetUser.username}** is already on a team${existingRole ? ` (**${existingRole.name}**)` : ""}. They must \`/release\` first.`
          ),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  // Check roster limit (owner doesn't count toward the limit)
  if (team.rosterLimit != null) {
    const currentPlayers = team.memberIds.filter((id) => id !== team.ownerId);
    if (currentPlayers.length >= team.rosterLimit) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle("Roster Full")
            .setDescription(
              `**${teamRole.name}** has reached its roster limit of **${team.rosterLimit}** player(s).\n\n` +
              `A player must be released before you can sign anyone new.`
            ),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }
  }

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
      `**Offered by:** <@${signerUser.id}>\n\n` +
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
      embeds: [
        new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("DM Failed")
          .setDescription(`Could not send a DM to **${targetUser.username}**. They may have DMs disabled.`),
      ],
    });
  }

  await interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("Offer Sent")
        .setDescription(`Offer sent to **${targetUser.username}**. Waiting for their response (10 min timeout)…`),
    ],
  });

  try {
    const btnInteraction = await dmMessage.awaitMessageComponent({
      componentType: ComponentType.Button,
      filter: (i) => i.user.id === targetUser.id,
      time: 600_000,
    });

    if (btnInteraction.customId === "sign_accept") {
      const member = await guild.members.fetch(targetUser.id).catch(() => null);

      if (!member) {
        await btnInteraction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0xed4245)
              .setTitle("Error")
              .setDescription("Could not find you in the server. The offer has been cancelled."),
          ],
          components: [],
        });
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xed4245)
              .setTitle("Member Not Found")
              .setDescription(`**${targetUser.username}** accepted but could not be found in the server.`),
          ],
        });
      }

      await member.roles.add(teamRole, `Signed by team owner ${signerUser.tag}`);
      addMemberToTeam(team.roleId, targetUser.id);

      await btnInteraction.update({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle("Offer Accepted")
            .setDescription(`You have joined **${teamRole.name}**! Welcome to the team.`),
        ],
        components: [],
      });

      const signChannel = await interaction.client.channels.fetch(SIGN_LOG_CHANNEL_ID).catch(() => null);
      await signChannel?.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle("Player Signed")
            .setDescription(`<@${member.id}> has been signed to **${teamRole.name}**.`)
            .setTimestamp(),
        ],
      });

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle("Signed!")
            .setDescription(`**${targetUser.username}** accepted and has been added to **${teamRole.name}**.`),
        ],
      });
    } else {
      await btnInteraction.update({
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle("Offer Rejected")
            .setDescription(`You have rejected the offer from **${teamRole.name}**.`),
        ],
        components: [],
      });

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xfee75c)
            .setTitle("Offer Rejected")
            .setDescription(`**${targetUser.username}** rejected your offer.`),
        ],
      });
    }
  } catch {
    await dmMessage
      .edit({
        embeds: [
          new EmbedBuilder()
            .setColor(0x808080)
            .setTitle("Offer Expired")
            .setDescription(`The offer from **${teamRole.name}** has expired.`),
        ],
        components: [],
      })
      .catch(() => null);

    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xfee75c)
          .setTitle("No Response")
          .setDescription(`**${targetUser.username}** did not respond in time. The offer has expired.`),
      ],
    });
  }
}
