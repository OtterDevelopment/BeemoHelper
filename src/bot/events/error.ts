import EventHandler from "../../../lib/classes/EventHandler.js";

export default class Err extends EventHandler {
    override async run(error: Error) {
        this.client.logger.error(error);
        this.client.logger.sentry.captureWithExtras(error, {
            Shard: this.client.shard?.ids[0]
        });
        const haste = await this.client.functions.uploadHaste(
            `${error.name}: ${error.message}`
        );
        return this.client.logger.webhookLog("console", {
            content: `${this.client.functions.generateTimestamp()} Shard ${
                this.client.shard?.ids[0]
            } encountered an error: ${haste}`
        });
    }
}

