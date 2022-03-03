import EventHandler from "../../../lib/classes/EventHandler.js";

export default class ShardError extends EventHandler {
    override async run(error: Error, shardId: number) {
        this.client.dataDog.increment("events", 1, ["event:shardError"]);
        this.client.logger.error(error);
        this.client.logger.sentry.captureWithExtras(error, { Shard: shardId });
        const haste = this.client.functions.uploadHaste(
            `${error.name}: ${error.message}`
        );
        return this.client.logger.webhookLog("console", {
            content: `${this.client.functions.generateTimestamp()} Shard ${
                this.client.shard?.ids[0]
            } encountered an error: ${haste}`
        });
    }
}
