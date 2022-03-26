import EventHandler from "../../../lib/classes/EventHandler.js";

export default class Warn extends EventHandler {
    override async run(info: string) {
        this.client.logger.info(
            `Shard ${this.client.shard?.ids[0]} sent a warning: ${info}`
        );
        this.client.logger.webhookLog("console", {
            content: `${this.client.functions.generateTimestamp()} Shard ${
                this.client.shard?.ids[0]
            } sent a warning: ${info}`
        });
    }
}
