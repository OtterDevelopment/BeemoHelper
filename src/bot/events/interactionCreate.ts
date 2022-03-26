import { Interaction } from "discord.js";
import EventHandler from "../../../lib/classes/EventHandler.js";

export default class InteractionCreate extends EventHandler {
    override async run(interaction: Interaction) {
        this.client.logger.info(
            `${interaction.type} interaction created: ${interaction.toString()}`
        );
        // @ts-ignore
        if (this.client.mongo.topology.s.state !== "connected")
            // @ts-ignore
            return interaction.reply(
                this.client.functions.generateErrorMessage(
                    {
                        title: "Not Ready",
                        description:
                            "I'm not ready yet, please try again in a moment!"
                    },
                    true
                )
            );
        if (interaction.isCommand()) {
            this.client.stats.commandsRun++;
            return this.client.slashCommandHandler.handleCommand(interaction);
        } else if (interaction.isButton())
            return this.client.buttonHandler.handleButton(interaction);
        else if (interaction.isSelectMenu())
            return this.client.dropDownHandler.handleDropDown(interaction);
        else if (interaction.isAutocomplete())
            return this.client.autoCompleteHandler.handleAutoComplete(
                interaction
            );
        const error = new Error("Invalid Interaction: Never seen this before.");
        this.client.logger.error(error);
        this.client.logger.sentry.captureWithInteraction(error, interaction);
        // @ts-ignore
        return interaction.reply(
            this.client.functions.generateErrorMessage(
                {
                    title: "Invalid Interaction",
                    description: "I've never seen this type of interaction"
                },
                true
            )
        );
    }
}
