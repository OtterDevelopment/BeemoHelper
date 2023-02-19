import { APIEmbed, TextChannel } from "discord.js";
import Raid from "../../../lib/classes/Raid.js";
import EventHandler from "../../../lib/classes/EventHandler.js";

export default class BeemoMessageCreate extends EventHandler {
    /**
     * Handle the creation of a message.
     * @param message The message that was created.
     */
    public override async run(message: {
        type: "raid";
        guildId: string;
        logURL: string;
        messageDescription: string;
    }) {
        const guild = this.client.guilds.cache.get(message.guildId);
        if (!guild) return;

        if (!guild.members.me?.permissions.has("BanMembers")) {
            this.client.metrics.incrementFailedRaids(
                guild.id,
                guild.shardId,
                "MISSING_BAN_MEMBERS"
            );

            return this.client.logger.info(
                `Skipping raid in ${guild.name} [$${guild.id}] as I don't have the Ban Members permission.`
            );
        }

        const actionLog = await this.client.prisma.actionLog.findUnique({
            where: { guildId: guild.id }
        });
        if (!actionLog) {
            this.client.metrics.incrementFailedRaids(
                guild.id,
                guild.shardId,
                "NO_ACTION_LOG"
            );

            return this.client.logger.info(
                `Skipping raid in ${guild.name} [$${guild.id}] as there is no action log set up.`
            );
        }

        const actionLogChannel = guild.channels.cache.get(actionLog.channelId);
        if (!actionLogChannel) {
            this.client.metrics.incrementFailedRaids(
                guild.id,
                guild.shardId,
                "NO_ACTION_LOG"
            );

            this.client.logger.info(
                `Skipping raid in ${guild.name} [$${guild.id}] as the action log no longer exists.`
            );

            return this.client.prisma.actionLog.delete({
                where: { guildId: guild.id }
            });
        } else if (
            !actionLogChannel
                .permissionsFor(guild.members.me)
                .has(["ViewChannel", "SendMessages"])
        ) {
            this.client.metrics.incrementFailedRaids(
                guild.id,
                guild.shardId,
                "MISSING_VIEW_SEND_PERMISSIONS"
            );

            return this.client.logger.info(
                `Skipping raid in ${guild.name} [$${guild.id}] as I don't have the View Channel and or Send Messages permissions in the action log.`
            );
        }

        const logURL = message.messageDescription.match(
            /https:\/\/logs.beemo.gg\/antispam\/[\w]*/g
        )![0];
        const response = await fetch(logURL);
        const logText = await response.text();

        const raid = new Raid(
            this.client,
            guild,
            logURL,
            logText
                .split("Raw IDs:")
                .at(-1)
                ?.match(/\d{17,18}/g)
                ?.reverse() || []
        );

        await raid.start();

        if (!raid.bannedMembers.length)
            return this.client.logger.info(
                `Not logging the raid on ${guild.name} [${guild.id}] (${logURL}) as I didn't ban any members.`
            );

        this.client.metrics.incrementSuccessfulRaids(
            guild.id,
            guild.shardId,
            raid.bannedMembers.length
        );

        const embed = {
            title: "Beemo Helper",
            description: `**${guild.name}** \`[${guild.id}]\` was raided by ${
                raid.userIds.length
            } user${
                raid.userIds.length === 1 ? "" : "s"
            }!\nBeemo Helper banned ${raid.bannedMembers.length} user${
                raid.bannedMembers.length === 1 ? "" : "s"
            }!\n\n[**Beemo Log**](${logURL})\n[**Beemo Helper Log**](${await this.client.functions.uploadToHastebin(
                `${raid.userIds.length} user raid detected against ${
                    guild.name
                } [${guild.id}] by Beemo on ${
                    this.client.logger.timestamp
                }\nBeemo Log: ${logURL}\n\nBeemo Helper Banned:\n\n${raid.bannedMembers.join(
                    "\n"
                )}`
            )})`,
            color: this.client.config.colors.success
        } as APIEmbed;

        if (this.client.isReady())
            await this.client.shard?.broadcastEval(
                async (client, { config, e }) => {
                    const channel = client.channels.cache.get(
                        config.otherConfig.helperGlobalLogChannelId
                    ) as TextChannel | null;

                    if (!channel) return;

                    return channel.send({ embeds: [e] }).catch(error => {
                        if (error.code === 50013)
                            this.client.logger.info(
                                `I don't have enough permissions to log raids in channel ${channel.name} [${channel.id}] in guild ${guild.name} [${guild.id}].`
                            );
                        else {
                            this.client.logger.error(error);
                            this.client.logger.sentry.captureWithExtras(error, {
                                event: "Beemo Message Create",
                                guild: channel.guild,
                                channel
                            });
                        }
                    });
                },
                { context: { config: this.client.config, e: embed } }
            );

        (actionLogChannel as TextChannel)
            .send({ embeds: [embed] })
            .catch(error => {
                if (error.code === 50013)
                    this.client.logger.info(
                        `I don't have enough permissions to log raids in channel ${actionLogChannel.name} [${actionLogChannel.id}] in guild ${guild.name} [${guild.id}].`
                    );
                else {
                    this.client.logger.error(error);
                    this.client.logger.sentry.captureWithExtras(error, {
                        event: "Beemo Message Create",
                        guild: actionLogChannel.guild,
                        actionLogChannel
                    });
                }
            });

        return this.client.logger.info(
            `I have logged the raid on ${guild.name} [${guild.id}] (${logURL}) with ${raid.bannedMembers.length} members banned out of ${raid.userIds.length} total members.`
        );
    }
}

