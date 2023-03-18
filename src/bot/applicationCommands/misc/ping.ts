import {
    APIChatInputApplicationCommandInteraction,
    ApplicationCommandType,
    MessageFlags
} from "@discordjs/core";
import { DiscordSnowflake } from "@sapphire/snowflake";
import Language from "../../../../lib/classes/Language.js";
import ExtendedClient from "../../../../lib/extensions/ExtendedClient.js";
import ApplicationCommand from "../../../../lib/classes/ApplicationCommand.js";

export default class Ping extends ApplicationCommand {
    /**
     * Create our ping command.
     * @param client Our extended client.
     */
    constructor(client: ExtendedClient) {
        super(client, {
            options: {
                name: "ping",
                description: `Pong! Get the current ping / latency of ${client.config.botName}.`,
                type: ApplicationCommandType.ChatInput
            }
        });
    }

    /**
     * Run this application command.
     * @param interaction The interaction to run this command on.
     * @param language The language to use when replying to the interaction.
     */
    public async run({
        interaction,
        language
    }: {
        interaction: APIChatInputApplicationCommandInteraction;
        shardId: number;
        language: Language;
    }) {
        await this.client.api.interactions.reply(
            interaction.id,
            interaction.token,
            {
                content: language.get("PING"),
                flags: MessageFlags.Ephemeral
            }
        );

        const message = await this.client.api.interactions.getOriginalReply(
            interaction.application_id,
            interaction.token
        );

        const hostLatency =
            new Date(message.timestamp).getTime() -
            DiscordSnowflake.timestampFrom(interaction.id);

        return this.client.api.interactions.editReply(
            interaction.application_id,
            interaction.token,
            {
                content: language.get("PONG", {
                    hostLatency
                })
            }
        );
    }
}
