import EventHandler from "../../../lib/classes/EventHandler.js";

export default class ShardReconnecting extends EventHandler {
    override async run(shardId: number) {
        this.client.dataDog.increment("events", 1, ["event:shardReconnecting"]);
        this.client.logger.info(
            `Shard ${shardId} is reconnecting to the gateway!`
        );
    }
}
