import { CloseEvent } from "discord.js";
import EventHandler from "../../../lib/classes/EventHandler.js";

export default class ShardDisconnect extends EventHandler {
    override async run(event: CloseEvent, shardId: number) {
        this.client.logger.info(
            `Shard ${shardId} disconnected from the gateway with code ${event.code} and will not reconnect.`
        );
    }
}
