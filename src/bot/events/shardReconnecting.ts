import EventHandler from "../../../lib/classes/EventHandler.js";

export default class ShardReconnecting extends EventHandler {
    /**
     * Handle a shard reconnecting to the gateway.
     * @param shardId The shard ID.
     */
    override async run(shardId: number) {
        this.client.logger.info(
            `Shard ${shardId} is reconnecting to the gateway!`
        );

        return this.client.logger.webhookLog("console", {
            content: `${this.client.functions.generateTimestamp()} Shard ${shardId} is reconnecting to the gateway!`,
            username: `${this.client.config.botName} | Console Logs`
        });
    }
}
