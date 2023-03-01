import { AutocompleteInteraction, Interaction } from "discord.js";
import ExtendedClient from "../extensions/ExtendedClient";
import AutoComplete from "./AutoComplete";
import Language from "./Language";

export default class AutoCompleteHandler {
    /** Our extended client. */
    public readonly client: ExtendedClient;

    /**
     * Create our auto complete handler.
     * @param client Our extended client.
     */
    constructor(client: ExtendedClient) {
        this.client = client;
    }

    /**
     * Load all of the auto completes in the autoCompletes directory.
     */
    public loadAutoCompletes() {
        this.client.functions
            .getFiles(
                `${this.client.__dirname}/dist/src/bot/autoCompletes`,
                "",
                true
            )
            .forEach(parentFolder =>
                this.client.functions
                    .getFiles(
                        `${this.client.__dirname}/dist/src/bot/autoCompletes/${parentFolder}`,
                        ".js"
                    )
                    .forEach(async fileName => {
                        const AutoCompleteFile = await import(
                            `../../src/bot/autoCompletes/${parentFolder}/${fileName}`
                        );

                        // @ts-ignore
                        const autoComplete = new AutoCompleteFile.default(
                            this.client
                        ) as AutoComplete;

                        return this.client.autoCompletes.set(
                            autoComplete.accepts,
                            autoComplete
                        );
                    })
            );
    }

    /**
     * Reload all of the auto completes.
     */
    public reloadAutoCompletes() {
        this.client.autoCompletes.clear();
        this.loadAutoCompletes();
    }

    /**
     * Get an auto complete by its name.
     * @param name The name of the auto complete.
     * @returns The auto complete with the specified name within the accepts field, otherwise undefined.
     */
    private getAutoComplete(name: string) {
        return this.client.autoCompletes.find(autoComplete =>
            autoComplete.accepts.includes(name)
        );
    }

    /** Handle an interaction properly to ensure that it can invoke an auto complete.
     * @param interaction The interaction that is attempting to invoke an auto complete.
     */
    public async handleAutoComplete(interaction: AutocompleteInteraction) {
        const name = [
            interaction.commandName,
            interaction.options.getSubcommandGroup(false) || "",
            interaction.options.getSubcommand(false) || "",
            interaction.options.getFocused(true).name || ""
        ]
            .filter(Boolean)
            .join("-");

        const autoComplete = this.getAutoComplete(name);
        if (!autoComplete) return;

        const userLanguage = await this.client.prisma.userLanguage.findUnique({
            where: { userId: interaction.user.id }
        });
        const language = this.client.languageHandler.getLanguage(
            userLanguage?.languageId || interaction.locale
        );

        return this.runAutoComplete(autoComplete, interaction, language);
    }

    /**
     * Run an auto complete.
     * @param autoComplete The auto complete we want to run.
     * @param interaction The interaction that invoked the auto complete.
     * @param language The language to use when replying to the interaction.
     */
    private async runAutoComplete(
        autoComplete: AutoComplete,
        interaction: AutocompleteInteraction,
        language: Language
    ) {
        autoComplete.run(interaction, language).catch(async error => {
            this.client.logger.error(error);

            await this.client.logger.sentry.captureWithInteraction(
                error,
                interaction as Interaction
            );

            if (!interaction.responded) return interaction.respond([]);
        });
    }
}
