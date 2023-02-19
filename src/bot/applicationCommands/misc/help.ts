import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    CommandInteraction
} from "discord.js";
import ExtendedClient from "../../../../lib/extensions/ExtendedClient.js";
import ApplicationCommand from "../../../../lib/classes/ApplicationCommand.js";

export default class Help extends ApplicationCommand {
    /**
     * Create our help command.
     * @param client Our extended client.
     */
    constructor(client: ExtendedClient) {
        super(client, {
            options: {
                name: "help",
                description: `Get help with ${client.config.botName}.`
            }
        });
    }

    /**
     * Run this application command.
     * @param interaction The interaction to run this command on.
     */
    override async run(interaction: CommandInteraction) {
        return interaction.reply({
            embeds: [
                {
                    title: "Beemo Helper",
                    description:
                        "Beemo Helper is designed to help [Beemo](https://beemo.gg) deal with user bot raids.\n\nOnce Beemo detects that your server is getting raided it will log it. If Beemo Helper is in your server it will detect this raid and ban all of the raiders from the bottom up of the log. Thus, effectively doubling the speed of bans.\n\n**Beemo Helper does not preemptively ban all users in all of Beemo's raid logs for all servers.**\n\nAll you need to do to set up Beemo Helper is set an action log channel with `/config action_log set #CHANNEL` and Beemo Helper will do the rest!\n\n**Make sure Beemo Helper has permissions to send messages and ban members.**",
                    footer: {
                        text: `Beemo Helper v${
                            process.env.NODE_ENV === "development"
                                ? `${this.client.config.version}-dev`
                                : this.client.config.version
                        }`
                    },
                    color: this.client.config.colors.primary
                }
            ],
            components: [
                new ActionRowBuilder<ButtonBuilder>({
                    components: [
                        new ButtonBuilder({
                            label: "Invite Beemo Helper #1",
                            url: this.client.config.minimalInvite[1],
                            style: ButtonStyle.Link
                        }),
                        new ButtonBuilder({
                            label: "Invite Beemo Helper #2",
                            url: this.client.config.minimalInvite[2],
                            style: ButtonStyle.Link
                        }),
                        new ButtonBuilder({
                            label: "Support Server",
                            url: this.client.config.supportServer,
                            style: ButtonStyle.Link
                        }),
                        new ButtonBuilder({
                            label: "GitHub",
                            url: this.client.config.gitHub,
                            style: ButtonStyle.Link
                        })
                    ]
                })
            ]
        });
    }
}

