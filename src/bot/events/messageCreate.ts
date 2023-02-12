import { Message } from "discord.js";
import EventHandler from "../../../lib/classes/EventHandler.js";

export default class MessageCreate extends EventHandler {
    /**
     * Handle the creation of a message.
     * @param message The message that was created.
     */
    public override async run(message: Message) {
        if (
            message.author.bot &&
            message.channelId !==
                this.client.config.otherConfig.beemoGlobalLogChannelId
        )
            return;
        else if (
            message.channelId ===
                this.client.config.otherConfig.beemoGlobalLogChannelId &&
            message.author.bot
        ) {
            if (
                message.embeds[0]?.author?.name !==
                "Userbot raid detected by antispam"
            )
                return;

            const matchedGuildID =
                message.embeds[0].description?.match(/\d{17,19}/g);
            if (!matchedGuildID) return;
            const [guildId] = matchedGuildID;

            const logURL = message.embeds[0].description!.match(
                /https:\/\/logs.beemo.gg\/antispam\/[\w]*/g
            )![0];

            return this.client.shard?.send({
                type: "raid",
                guildId,
                logURL,
                messageDescription: message.embeds[0].description!
            });
        }

        return this.client.textCommandHandler.handleTextCommand(message);
    }
}
