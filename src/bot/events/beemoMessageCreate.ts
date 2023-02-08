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
        this.client.logger.debug(0);
        this.client.logger.debug(1);

        const guild = this.client.guilds.cache.get(message.guildId);
        this.client.logger.debug(3, guild);
        if (!guild) return;

        if (!guild.members.me?.permissions.has("BanMembers")) {
            this.client.metrics.incrementFailedRaids(
                guild.id,
                guild.shardId,
                "MISSING_BAN_MEMBERS"
            );

            return this.client.logger.debug(
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

            return this.client.logger.debug(
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

            this.client.logger.debug(
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

            return this.client.logger.debug(
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

        this.client.logger.debug(raid);

        // await raid.start();

        if (!raid.bannedMembers.length) return;

        // success
    }
}

