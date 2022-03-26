import {
    CommandInteraction,
    MessageActionRow,
    MessageButton
} from "discord.js";
import SlashCommand from "../../../../lib/classes/SlashCommand.js";
import BetterClient from "../../../../lib/extensions/BetterClient.js";

export default class Help extends SlashCommand {
    constructor(client: BetterClient) {
        super("help", client, {
            description: `Get help with ${client.config.botName}.`
        });
    }

    override async run(interaction: CommandInteraction) {
        return interaction.reply(
            this.client.functions.generatePrimaryMessage(
                {
                    title: "Beemo Helper",
                    description:
                        "Beemo Helper is designed to help [Beemo](https://beemo.gg) deal with user bot raids.\n\nOnce Beemo detects that your server is getting raided it will log it. If Beemo Helper is in your server it will detect this raid and ban all of the raiders from the bottom up of the log. Thus, effectively doubling the speed of bans.\n\n**Beemo Helper does not preemptively ban all users in all of Beemo's raid logs for all servers.**\n\nAll you need to do to set up Beemo Helper is set an action log channel with `/config action_channel #CHANNEL` and Beemo Helper will do the rest!\n\n**Make sure Beemo Helper has permissions to send messages and ban members.**",
                    footer: {
                        text: `Beemo Helper v${
                            process.env.NODE_ENV === "development"
                                ? `${this.client.config.version}-dev`
                                : this.client.config.version
                        }`
                    }
                },
                [
                    new MessageActionRow({
                        components: [
                            new MessageButton({
                                label: "Invite Me",
                                url: this.client.config.minimalInvite,
                                style: "LINK"
                            }),
                            new MessageButton({
                                label: "Support Server",
                                url: this.client.config.supportServer,
                                style: "LINK"
                            }),
                            new MessageButton({
                                label: "GitHub",
                                url: this.client.config.gitHub,
                                style: "LINK"
                            })
                        ]
                    })
                ]
            )
        );
    }
}
