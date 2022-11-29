import { Guild, PermissionResolvable, TextChannel } from "discord.js";
import EventHandler from "../../../lib/classes/EventHandler.js";
import BetterMessage from "../../../lib/extensions/BetterMessage.js";
import Raid from "../../../lib/classes/Raid.js";

export default class BeemoMessageCreate extends EventHandler {
    /**
     * The global action log for Beemo Helper.
     */
    private globalActionLog?: TextChannel;

    override async run(message: BetterMessage) {
        this.client.logger.debug("beemoMessageCreate event emitted");

        if (
            message.embeds[0]?.author?.name !==
            "Userbot raid detected by antispam"
        )
            return;
        else if (!this.globalActionLog) {
            const channels = (await this.client.shard?.broadcastEval(
                async client =>
                    client.channels.cache.get(
                        this.client.config.otherConfig.helperGlobalLogChannelId
                    )
            )) as Array<TextChannel | null>;

            const channel = channels?.filter(Boolean)[0];

            if (!channel)
                return this.client.logger.info(
                    "Global action log channel not found."
                );

            this.globalActionLog = channel as TextChannel;
        }

        const guildId = message.embeds[0].description?.match(/\d{17,19}/g);
        this.client.dataDog.increment("totalRaids", 1, [`guild:${guildId}`]);

        const guilds = (await this.client.shard?.broadcastEval(async client =>
            client.guilds.cache.get(guildId?.[0] || "")
        )) as Array<Guild | null>;

        const guild = guilds?.filter(Boolean)[0];
        if (!guild) return;

        this.client.logger.info(
            `Beemo has found a raid in ${guild.name} [${guild.id}]`
        );

        if (!guild.me?.permissions.has("BAN_MEMBERS")) {
            this.client.dataDog.increment(
                "abandonedRaids.missingPermissions",
                1,
                [`guild:${guildId}`, "missingPermission:BAN_MEMBERS"]
            );
            return this.client.logger.info(
                `Skipping raid in ${guild.name} [${guild.id}] as I don't have the BAN_MEMBERS permission.`
            );
        }

        const actionLog = await this.client.mongo
            .db("servers")
            .collection("actionLogs")
            .findOne({ _id: guild.id });
        const actionLogChannel = guild.channels.cache.get(actionLog?.channel);
        if (!actionLogChannel) {
            this.client.dataDog.increment(
                "abandonedRaids.missingActionLogChannel",
                1,
                [`guild:${guildId}`]
            );
            return this.client.logger.info(
                `Skipping raid in ${guild.name} [${guild.id}] as they don't have an action log set.`
            );
        } else if (
            !actionLogChannel
                .permissionsFor(guild.me)
                .has(["VIEW_CHANNEL", "SEND_MESSAGES"])
        ) {
            this.client.dataDog.increment(
                "abandonedRaids.missingPermissions",
                1,
                [`guild:${guildId}`].concat(
                    ["VIEW_CHANNEL", "SEND_MESSAGES"]
                        .filter(
                            permission =>
                                !actionLogChannel
                                    .permissionsFor(guild.me!)
                                    .has(permission as PermissionResolvable)
                        )
                        .map(permission => `missingPermission:${permission}`)
                )
            );
            return this.client.logger.info(
                `Skipping raid in ${guild.name} [${guild.id}] as I don't have the VIEW_CHANNEL or SEND_MESSAGES permissions in their action log.`
            );
        }
        const logUrl = message.embeds[0].description!.match(
            /https:\/\/logs.beemo.gg\/antispam\/[\w]*/g
        )![0];
        const response = await fetch(logUrl);
        const logText = await response.text();
        const raid = new Raid(
            this.client,
            guild,
            logUrl,
            logText
                .split("Raw IDs:")
                .at(-1)
                ?.match(/\d{17,18}/g)
                ?.reverse() || []
        );

        await raid.start();

        if (!raid.bannedMembers.length)
            return this.client.logger.info(
                `Not logging the raid on ${guild.name} [${guild.id}] (${logUrl}) as I didn't ban any members.`
            );

        this.client.dataDog.increment("successfulRaids.total", 1, [
            `guild:${guildId}`,
            `raiders:${raid.userIds.length}`
        ]);

        this.client.dataDog.increment(
            "successfulRaids.banned",
            raid.bannedMembers.length,
            [`guild:${guildId}`]
        );

        const embed = this.client.functions.generateSuccessMessage({
            title: "Beemo Helper",
            description: `**${guild.name}** \`[${guild.id}]\` was raided by ${
                raid.userIds.length
            } user${
                raid.userIds.length === 1 ? "" : "s"
            }!\nBeemo Helper banned ${raid.bannedMembers.length} user${
                raid.bannedMembers.length === 1 ? "" : "s"
            }!\n\n[**Beemo Log**](${logUrl})\n[**Beemo Helper Log**](${await this.client.functions.uploadHaste(
                `${raid.userIds.length} user raid detected against ${
                    guild.name
                } [${guild.id}] by Beemo on ${
                    this.client.logger.timestamp
                }\nBeemo Log: ${logUrl}\n\nBeemo Helper Banned:\n\n${raid.bannedMembers.join(
                    "\n"
                )}`
            )})`
        });

        await Promise.all(
            [actionLogChannel as TextChannel, this.globalActionLog!].map(
                channel =>
                    channel.send(embed).catch(error => {
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
                    })
            )
        );

        return this.client.logger.info(
            `I have logged the raid on ${guild.name} [${guild.id}] (${logUrl}) with ${raid.bannedMembers.length} members banned out of ${raid.userIds.length} total members.`
        );
    }
}

