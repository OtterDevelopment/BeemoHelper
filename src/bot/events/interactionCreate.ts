import { Interaction } from "discord.js";
import EventHandler from "../../../lib/classes/EventHandler.js";

export default class InteractionCreate extends EventHandler {
    /**
     * Handle the creation of an interaction.
     * @param interaction The interaction that was created.
     */
    public override async run(interaction: Interaction) {
        this.client.submitMetricToManager("interactions_created", "inc", 1, {
            // eslint-disable-next-line no-nested-ternary
            name: interaction.isMessageComponent()
                ? interaction.customId
                : interaction.isCommand()
                ? interaction.commandName
                : "unknown",
            type: interaction.type.toString(),
            shard: (this.client.shard?.ids[0] ?? 0).toString()
        });
        this.client.submitMetricToManager("user_locales", "inc", 1, {
            locale: interaction.locale,
            shard: (this.client.shard?.ids[0] ?? 0).toString()
        });

        if (interaction.isCommand() || interaction.isContextMenuCommand())
            return this.client.applicationCommandHandler.handleApplicationCommand(
                interaction
            );
        else if (interaction.isAutocomplete())
            return this.client.autoCompleteHandler.handleAutoComplete(
                interaction
            );
        else if (interaction.isButton())
            return this.client.buttonHandler.handleButton(interaction);

        if (interaction.isRepliable()) {
            const userLanguage =
                await this.client.prisma.userLanguage.findUnique({
                    where: {
                        userId: interaction.user.id
                    }
                });
            const language = this.client.languageHandler.getLanguage(
                userLanguage?.languageId || interaction.locale
            );

            return interaction.reply({
                embeds: [
                    {
                        title: language.get("INVALID_INTERACTION_TITLE"),
                        description: language.get(
                            "INVALID_INTERACTION_DESCRIPTION"
                        ),
                        color: this.client.config.colors.error
                    }
                ],
                ephemeral: true
            });
        }
    }
}
