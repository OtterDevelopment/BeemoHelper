/* eslint-disable import/order */
import Button from "./Button.js";
import { ButtonInteraction } from "discord.js";
import BetterClient from "../extensions/BetterClient.js";

export default class ButtonHandler {
    /**
     * Our client.
     */
    private readonly client: BetterClient;

    /**
     * How long a user must wait between each button.
     */
    private readonly coolDownTime: number;

    /**
     * Our user's cooldowns.
     */
    private readonly coolDowns: Set<string>;

    /**
     * Create our ButtonHandler.
     * @param client Our client.
     */
    constructor(client: BetterClient) {
        this.client = client;

        this.coolDownTime = 1000;
        this.coolDowns = new Set();
    }

    /**
     * Load all the buttons in the buttons directory.
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
                        const buttonFile = await import(
                            `../../src/bot/buttons/${parentFolder}/${fileName}`
                        );
                        // eslint-disable-next-line new-cap
                        const button: Button = new buttonFile.default(
                            this.client
                        );
                        return this.client.buttons.set(button.name, button);
                    })
            );
    }

    /**
     * Reload all the buttons in the buttons directory.
     */
    public reloadButtons() {
        this.client.buttons.clear();
        this.loadButtons();
    }

    /**
     * Fetch the button that starts with the provided customId.
     * @param customId The customId to search for.
     * @returns The button we've found.
     */
    private fetchButton(customId: string): Button | undefined {
        return this.client.buttons.find(button =>
            customId.startsWith(button.name)
        );
    }

    /**
     * Handle the interaction created for this button to make sure the user and client can execute it.
     * @param interaction The interaction created.
     */
    public async handleButton(interaction: ButtonInteraction) {
        const button = this.fetchButton(interaction.customId);
        if (
            !button ||
            (process.env.NODE_ENV === "development" &&
                !this.client.functions.isAdmin(interaction.user.id))
        )
            return;

        const missingPermissions = button.validate(interaction);
        if (missingPermissions)
            return interaction.reply(
                this.client.functions.generateErrorMessage(missingPermissions)
            );

        const preChecked = await button.preCheck(interaction);
        if (!preChecked[0]) {
            if (preChecked[1])
                await interaction.reply(
                    this.client.functions.generateErrorMessage(preChecked[1])
                );
            return;
        }

        return this.runButton(button, interaction);
    }

    /**
     * Execute our button.
     * @param button The button we want to execute.
     * @param interaction The interaction for our button.
     */
    private async runButton(button: Button, interaction: ButtonInteraction) {
        if (this.coolDowns.has(interaction.user.id))
            return interaction.reply(
                this.client.functions.generateErrorMessage({
                    title: "Command Cooldown",
                    description:
                        "Please wait a second before running this button again!"
                })
            );

        this.client.usersUsingBot.add(interaction.user.id);
        button
            .run(interaction)
            .then(() => {
                this.client.usersUsingBot.delete(interaction.user.id);
                this.client.dataDog.increment("buttonUsage", 1, [
                    `button:${button.name}`
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
                        description: `An unexpected error was encountered while running this button, my developers have already been notified! Feel free to join my support server in the mean time!`,
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
        return setTimeout(
            () => this.coolDowns.delete(interaction.user.id),
            this.coolDownTime
        );
    }
}

