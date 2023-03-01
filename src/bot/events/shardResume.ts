import EventHandler from "../../../lib/classes/EventHandler.js";

export default class ShardResume extends EventHandler {
    /**
     * Handle a shard reconnecting to the gateway.
     * @param shardId The shard ID.
     * @param replayedEvents The number of events replayed.
     */
    override async run(shardId: number, replayedEvents: number) {
        this.client.logger.info(
            `Shard ${shardId} resumed and replayed ${replayedEvents} events!`
        );

        return this.client.logger.webhookLog("console", {
            content: `${this.client.functions.generateTimestamp()} Shard ${shardId} resumed and replayed ${replayedEvents} events!`,
            username: `${this.client.config.botName} | Console Logs`
        });
    }
}
