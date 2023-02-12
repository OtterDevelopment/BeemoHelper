import {
    ApplicationCommandOptionType,
    ApplicationCommandType,
    ChannelType,
    ChatInputCommandInteraction
} from "discord.js";
import Language from "../../../../lib/classes/Language.js";
import ExtendedClient from "../../../../lib/extensions/ExtendedClient.js";
import ApplicationCommand from "../../../../lib/classes/ApplicationCommand.js";

export default class Config extends ApplicationCommand {
    /**
     * Create our config command.
     * @param client Our extended client.
     */
    constructor(client: ExtendedClient) {
        super(client, {
            options: {
                name: "config",
                type: ApplicationCommandType.ChatInput,
                description: `Commands related to configuring ${client.config.botName} for this server.`,
                defaultMemberPermissions: ["ManageGuild"],
                options: [
                    {
                        name: "action_log",
                        description:
                            "The channel to post action logs into for this server.",
                        type: ApplicationCommandOptionType.SubcommandGroup,
                        options: [
                            {
                                name: "set",
                                description:
                                    "Set the action log for this server.",
                                type: ApplicationCommandOptionType.Subcommand,
                                options: [
                                    {
                                        name: "channel",
                                        description:
                                            "The channel to set the action log to.",
                                        type: ApplicationCommandOptionType.Channel,
                                        channelTypes: [ChannelType.GuildText],
                                        required: true
                                    }
                                ]
                            },
                            {
                                name: "remove",
                                description:
                                    "Remove the current action log for this server.",
                                type: ApplicationCommandOptionType.Subcommand
                            }
                        ]
                    }
                ]
            }
        });
    }

    /**
     * Run this application command.
     * @param interaction The interaction to run this command on.
     * @param language The language to use when replying to the interaction.
     */
    public override async run(
        interaction: ChatInputCommandInteraction,
        language: Language
    ) {
        if (interaction.options.getSubcommandGroup(true) === "action_log") {
            if (interaction.options.getSubcommand(true) === "set") {
                return Promise.all([
                    this.client.prisma.actionLog.upsert({
                        where: { guildId: interaction.guildId! },
                        create: {
                            guildId: interaction.guildId!,
                            channelId: interaction.options.getChannel(
                                "channel",
                                true
                            ).id
                        },
                        update: {
                            channelId: interaction.options.getChannel(
                                "channel",
                                true
                            ).id
                        }
                    }),
                    interaction.reply({
                        embeds: [
                            {
                                title: language.get("ACTION_LOG_SET_TITLE"),
                                description: language.get(
                                    "ACTION_LOG_SET_DESCRIPTION",
                                    {
                                        actionLogChannel: interaction.options
                                            .getChannel("channel", true)
                                            .toString()
                                    }
                                ),
                                color: this.client.config.colors.success
                            }
                        ]
                    })
                ]);
            }

            return Promise.all([
                this.client.prisma.actionLog.delete({
                    where: { guildId: interaction.guildId! }
                }),
                interaction.reply({
                    embeds: [
                        {
                            title: language.get("ACTION_LOG_REMOVED_TITLE"),
                            description: language.get(
                                "ACTION_LOG_REMOVED_DESCRIPTION"
                            ),
                            color: this.client.config.colors.success
                        }
                    ]
                })
            ]);
        }
    }
}

