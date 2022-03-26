import EventHandler from "../../../lib/classes/EventHandler.js";
import BetterMessage from "../../../lib/extensions/BetterMessage.js";

export default class MessageCreate extends EventHandler {
    override async run(message: BetterMessage) {
        this.client.dataDog.increment("messagesSeen");
        if (
            message.author.bot &&
            message.author.id !== this.client.config.otherConfig.beemoId
        )
            return;
        // @ts-ignore
        else if (this.client.mongo.topology.s.state !== "connected") return;
        else if (
            message.author.id === this.client.config.otherConfig.beemoId &&
            message.channel.id ===
                this.client.config.otherConfig.beemoGlobalLogChannelId
        )
            this.client.emit("beemoMessageCreate", message);
        return this.client.textCommandHandler.handleCommand(message);
    }
}
