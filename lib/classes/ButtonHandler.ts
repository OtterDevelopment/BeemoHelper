import {
    ButtonInteraction,
    Interaction,
    InteractionReplyOptions
} from "discord.js";
import Button from "./Button.js";
import Language from "./Language.js";
import ExtendedClient from "../extensions/ExtendedClient.js";

export default class ButtonHandler {
    /** Our extended client. */
    public readonly client: ExtendedClient;

    /**
     * Create our button handler.
     * @param client Our extended client.
     */
    constructor(client: ExtendedClient) {
        this.client = client;
    }

    /**
     * Load all of the buttons in the buttons directory.
     */
    public loadButtons() {
        this.client.functions
            .getFiles(`${this.client.__dirname}/dist/src/bot/buttons`, "", true)
            .forEach(parentFolder =>
                this.client.functions
                    .getFiles(
                        `${this.client.__dirname}/dist/src/bot/buttons/${parentFolder}`,
                        ".js"
                    )
                    .forEach(async fileName => {
                        const ButtonFile = await import(
                            `../../src/bot/buttons/${parentFolder}/${fileName}`
                        );

                        // @ts-ignore
                        const button = new ButtonFile.default(
                            this.client
                        ) as Button;

                        return this.client.buttons.set(button.name, button);
                    })
            );
    }

    /**
     * Reload all of the buttons.
     */
    public reloadButtons() {
        this.client.autoCompletes.clear();
        this.loadButtons();
    }

    /**
     * Get a button by its name.
     * @param name The name of the button.
     * @returns The button with the specified name, otherwise undefined.
     */
    private getButton(name: string) {
        return this.client.buttons.find(button => name.startsWith(button.name));
    }

    /** Handle an interaction properly to ensure that it can invoke a button.
     * @param interaction The interaction that is attempting to invoke a button.
     */
    public async handleButton(interaction: ButtonInteraction) {
        const button = this.getButton(interaction.customId);
        if (!button) return;

        const userLanguage = await this.client.prisma.userLanguage.findUnique({
            where: { userId: interaction.user.id }
        });
        const language = this.client.languageHandler.getLanguage(
            userLanguage?.languageId || interaction.locale
        );

        const missingPermissions = await button.validate(interaction, language);
        if (missingPermissions)
            return interaction.reply({
                embeds: [
                    {
                        ...missingPermissions,
                        color: this.client.config.colors.error
                    }
                ],
                ephemeral: true
            });

        const [preChecked, preCheckedResponse] = await button.preCheck(
            interaction,
            language
        );
        if (!preChecked) {
            if (preCheckedResponse)
                await interaction.reply({
                    embeds: [
                        {
                            ...preCheckedResponse,
                            color: this.client.config.colors.error
                        }
                    ],
                    ephemeral: true
                });

            return;
        }

        return this.runButton(button, interaction, language);
    }

    /**
     * Run a button.
     * @param button The button we want to run.
     * @param interaction The interaction that invoked the auto complete.
     * @param language The language to use when replying to the interaction.
     */
    private async runButton(
        button: Button,
        interaction: ButtonInteraction,
        language: Language
    ) {
        button.run(interaction, language).catch(async error => {
            this.client.logger.error(error);

            const sentryId =
                await this.client.logger.sentry.captureWithInteraction(
                    error,
                    interaction as Interaction
                );

            const toSend = {
                embeds: [
                    {
                        title: language.get("AN_ERROR_HAS_OCCURRED_TITLE"),
                        description: language.get(
                            "AN_ERROR_HAS_OCCURRED_DESCRIPTION",
                            {
                                name: button.name,
                                type: "button"
                            }
                        ),
                        footer: {
                            text: `Sentry Event ID: ${sentryId}`
                        },
                        color: this.client.config.colors.error
                    }
                ],
                ephemeral: true
            } satisfies InteractionReplyOptions;

            if (!interaction.replied) return interaction.reply(toSend);
            else return interaction.followUp(toSend);
        });
    }
}

