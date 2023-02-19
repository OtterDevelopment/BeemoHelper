import { Snowflake } from "discord.js";
import EventHandler from "../../../lib/classes/EventHandler.js";

export default class ShardReady extends EventHandler {
    /**
     * Handle a shard being ready.
     * @param shardId The shard ID.
     * @param unavailableGuilds The unavailable guilds.
     */
    override async run(shardId: number, unavailableGuilds: Set<Snowflake>) {
        this.client.logger.info(
            `Shard ${shardId} online in ${
                this.client.guilds.cache.size
            } servers with ${unavailableGuilds?.size || 0} unavailable guilds.`
        );

        return this.client.logger.webhookLog("console", {
            content: `${this.client.functions.generateTimestamp()} Shard ${shardId} online in ${
                this.client.guilds.cache.size
            } servers with ${unavailableGuilds?.size || 0} unavailable guilds.`,
            username: `${this.client.config.botName} | Console Logs`
        });
    }
}

