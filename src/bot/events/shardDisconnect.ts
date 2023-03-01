import { CloseEvent } from "discord.js";
import EventHandler from "../../../lib/classes/EventHandler.js";

export default class ShardDisconnect extends EventHandler {
    /**
     * Handle a shard disconnecting from the gateway.
     * @param event The close event.
     * @param shardId The shard ID.
     */
    override async run(event: CloseEvent, shardId: number) {
        this.client.logger.info(
            `Shard ${shardId} disconnected from the gateway with code ${event.code} and will not reconnect with reason: ${event.reason}.`
        );

        return this.client.logger.webhookLog("console", {
            content: `${this.client.functions.generateTimestamp()} Shard ${shardId} disconnected from the gateway with code ${
                event.code
            } and will not reconnect with reason: ${event.reason}.`,
            username: `${this.client.config.botName} | Console Logs`
        });
    }
}
