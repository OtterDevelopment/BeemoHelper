import { SelectMenuInteraction } from "discord.js";
import BetterClient from "../extensions/BetterClient.js";
import DropDown from "./DropDown.js";

export default class DropdownHandler {
    /**
     * Our client.
     */
    private readonly client: BetterClient;

    /**
     * How long a user must wait between each dropdown.
     */
    private readonly coolDownTime: number;

    /**
     * Our user's cooldowns.
     */
    private readonly coolDowns: Set<string>;

    /**
     * Create our DropDownHandler.
     * @param client Our client.
     */
    constructor(client: BetterClient) {
        this.client = client;

        this.coolDownTime = 1000;
        this.coolDowns = new Set();
    }

    /**
     * Load all the dropdowns in the dropdowns directory.
     */
    public loadDropDowns(): void {
        this.client.functions
            .getFiles(
                `${this.client.__dirname}/dist/src/bot/dropDowns`,
                "",
                true
            )
            .forEach(parentFolder =>
                this.client.functions
                    .getFiles(
                        `${this.client.__dirname}/dist/src/bot/dropDowns`,
                        ".js"
                    )
                    .forEach(async fileName => {
                        const dropDownFile = await import(
                            `../../src/bot/buttons/${parentFolder}/${fileName}`
                        );
                        // eslint-disable-next-line new-cap
                        const dropDown: DropDown = new dropDownFile.default(
                            this.client
                        );
                        return this.client.dropDowns.set(
                            dropDown.name,
                            dropDown
                        );
                    })
            );
    }

    /**
     * Reload all the buttons in the dropdowns directory.
     */
    public reloadDropDowns() {
        this.client.dropDowns.clear();
        this.loadDropDowns();
    }

    /**
     * Fetch the dropdown that starts with the provided customId.
     * @param customId The customId to search for.
     * @returns The button we've found.
     */
    private fetchDropDown(customId: string): DropDown | undefined {
        return this.client.dropDowns.find(dropDown =>
            customId.startsWith(dropDown.name)
        );
    }

    /**
     * Handle the interaction created for this dropdown to make sure the user and client can execute it.
     * @param interaction The interaction created.
     */
    public async handleDropDown(interaction: SelectMenuInteraction) {
        const dropDown = this.fetchDropDown(interaction.message!.id);
        if (
            !dropDown ||
            (process.env.NODE_ENV === "development" &&
                !this.client.functions.isDeveloper(interaction.user.id))
        )
            return;

        const missingPermissions = dropDown.validate(interaction);
        if (missingPermissions)
            return interaction.reply(
                this.client.functions.generateErrorMessage(missingPermissions)
            );

        const preChecked = await dropDown.preCheck(interaction);
        if (!preChecked[0]) {
            if (preChecked[1])
                await interaction.reply(
                    this.client.functions.generateErrorMessage(preChecked[1])
                );
            return;
        }

        return this.runDropDown(dropDown, interaction);
    }

    /**
     * Execute our dropdown.
     * @param dropdown The dropdown we want to execute.
     * @param interaction The interaction for our dropdown.
     */
    private async runDropDown(
        dropdown: DropDown,
        interaction: SelectMenuInteraction
    ): Promise<any> {
        if (this.coolDowns.has(interaction.user.id))
            return interaction.reply(
                this.client.functions.generateErrorMessage({
                    title: "Command Cooldown",
                    description:
                        "Please wait a second before running this button again!"
                })
            );

        this.client.usersUsingBot.add(interaction.user.id);
        dropdown
            .run(interaction)
            .then(() => {
                this.client.usersUsingBot.delete(interaction.user.id);
                this.client.dataDog.increment("dropdownUsage", 1, [
                    `dropdown:${dropdown.name}`
                ]);
            })
            .catch(async (error): Promise<any> => {
                this.client.logger.error(error);
                const sentryId =
                    await this.client.logger.sentry.captureWithInteraction(
                        error,
                        interaction
                    );
                const toSend = this.client.functions.generateErrorMessage(
                    {
                        title: "An Error Has Occurred",
                        description: `An unexpected error was encountered while running this drop down, my developers have already been notified! Feel free to join my support server in the mean time!`,
                        footer: { text: `Sentry Event ID: ${sentryId} ` }
                    },
                    true
                );
                if (interaction.replied) return interaction.followUp(toSend);
                else
                    return interaction.reply({
                        ...toSend
                    });
            });
        this.coolDowns.add(interaction.user.id);
        setTimeout(
            () => this.coolDowns.delete(interaction.user.id),
            this.coolDownTime
        );
    }
}
