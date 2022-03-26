import { CommandInteraction } from "discord.js";
import SlashCommand from "../../../../lib/classes/SlashCommand.js";
import BetterClient from "../../../../lib/extensions/BetterClient.js";

export default class Config extends SlashCommand {
    constructor(client: BetterClient) {
        super("config", client, {
            description: `Configure ${client.config.botName} to your likings.`,
            permissions: ["MANAGE_GUILD"],
            guildOnly: true,
            options: [
                {
                    name: "action_log",
                    type: "SUB_COMMAND_GROUP",
                    description: `Set or remove the action log for ${client.config.botName}.`,
                    options: [
                        {
                            name: "set",
                            type: "SUB_COMMAND",
                            description: `Set the action log for ${client.config.botName}.`,
                            options: [
                                {
                                    name: "channel",
                                    type: "CHANNEL",
                                    channelTypes: ["GUILD_TEXT", "GUILD_NEWS"],
                                    description: `The channel for ${client.config.botName} to log actions into.`,
                                    required: true
                                }
                            ]
                        },
                        {
                            name: "remove",
                            type: "SUB_COMMAND",
                            description: `Remove the action log for ${client.config.botName}.`
                        }
                    ]
                }
            ]
        });
    }

    override async run(interaction: CommandInteraction) {
        if (interaction.options.getSubcommandGroup() === "action_log") {
            if (interaction.options.getSubcommand() === "set")
                return Promise.all([
                    this.client.mongo
                        .db("servers")
                        .collection("actionLogs")
                        .updateOne(
                            { _id: interaction.guild!.id },
                            {
                                $set: {
                                    channel:
                                        interaction.options.getChannel(
                                            "channel"
                                        )!.id
                                }
                            },
                            { upsert: true }
                        ),
                    interaction.reply(
                        this.client.functions.generateSuccessMessage({
                            title: "Action Log Set",
                            description: `I have set the action log channel to ${interaction.options
                                .getChannel("channel")
                                ?.toString()}!`
                        })
                    )
                ]);

            return Promise.all([
                this.client.mongo
                    .db("servers")
                    .collection("actionLogs")
                    .deleteOne({ _id: interaction.guild!.id }),
                interaction.reply(
                    this.client.functions.generateSuccessMessage({
                        title: "Action Log Removed",
                        description: `I have removed the action log channel!`
                    })
                )
            ]);
        }
    }
}
