import { CommandInteraction, Message } from "discord.js";
import SlashCommand from "../../../../lib/classes/SlashCommand.js";
import BetterClient from "../../../../lib/extensions/BetterClient.js";

export default class Ping extends SlashCommand {
    constructor(client: BetterClient) {
        super("ping", client, {
            description: `Pong! Get the current ping / latency of Positive Peter.`
        });
    }

    override async run(interaction: CommandInteraction) {
        const message = (await interaction.reply({
            content: "Ping?",
            fetchReply: true
        })) as Message;
        const hostLatency =
            message.createdTimestamp - interaction.createdTimestamp;
        const apiLatency = Math.round(this.client.ws.ping);
        return interaction.editReply({
            content: `Pong! Round trip took ${(
                hostLatency + apiLatency
            ).toLocaleString()}ms. (Host latency is ${hostLatency.toLocaleString()} and API latency is ${apiLatency.toLocaleString()}ms)`
        });
    }
}
