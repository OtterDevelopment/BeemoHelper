import {
    Message,
    MessagePayload,
    ReplyMessageOptions,
    Structures
} from "discord.js";

export default class BetterMessage extends Message {
    /**
     * Better reply function, if the message is deleted, just send a normal message instead.
     * @param options The options for our reply.
     */
    public override async reply(
        options: string | MessagePayload | ReplyMessageOptions
    ): Promise<BetterMessage> {
        try {
            if (this.deleted) return await this.channel.send(options);
            else return await super.reply(options);
        } catch {
            return this.channel.send(options);
        }
    }
}

// @ts-ignore
Structures.extend("Message", () => BetterMessage);
