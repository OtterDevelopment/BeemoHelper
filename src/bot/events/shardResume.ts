import EventHandler from "../../../lib/classes/EventHandler.js";

export default class ShardResume extends EventHandler {
    override async run(shardId: number, replayedEvents: number) {
        this.client.logger.info(
            `Shard ${shardId} resumed and replayed ${replayedEvents} events!`
        );
    }
}
