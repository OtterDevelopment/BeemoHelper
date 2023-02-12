import {
    ApplicationCommandType,
    CommandInteraction,
    Interaction,
    InteractionReplyOptions
} from "discord.js";
import Language from "./Language.js";
import ApplicationCommand from "./ApplicationCommand.js";
import ExtendedClient from "../extensions/ExtendedClient.js";
import Logger from "./Logger.js";

export default class ApplicationCommandHandler {
    /** Our extended client. */
    public readonly client: ExtendedClient;

    /** How long a user must wait before being able to run an application command again. */
    public readonly coolDownTime: number;

    /** A list of user IDs that currently have a cooldown applied. */
    public readonly cooldowns: Set<string>;

    /**
     * Create our application command handler.
     * @param client Our extended client.
     */
    constructor(client: ExtendedClient) {
        this.client = client;

        this.coolDownTime = 200;
        this.cooldowns = new Set();
    }

    /**
     * Load all of the application commands in the applicationCommands directory.
     */
    public loadApplicationCommands() {
        this.client.functions
            .getFiles(
                `${this.client.__dirname}/dist/src/bot/applicationCommands`,
                "",
                true
            )
            .forEach(parentFolder =>
                this.client.functions
                    .getFiles(
                        `${this.client.__dirname}/dist/src/bot/applicationCommands/${parentFolder}`,
                        ".js"
                    )
                    .forEach(async fileName => {
                        const CommandFile = await import(
                            `../../src/bot/applicationCommands/${parentFolder}/${fileName}`
                        );

                        // @ts-ignore
                        const command = new CommandFile.default(
                            this.client
                        ) as ApplicationCommand;

                        return this.client.applicationCommands.set(
                            command.name,
                            command
                        );
                    })
            );
    }

    /**
     * Register all of the application commands on Discord.
     * @returns True or False depending on if the application commands were registered successfully.
     */
    public async registerApplicationCommands() {
        if (process.env.NODE_ENV === "production") {
            const guildOnlyCommands: Record<string, ApplicationCommand[]> = {};

            this.client.applicationCommands
                .filter(applicationCommand => applicationCommand.guilds.length)
                .forEach(applicationCommand => {
                    applicationCommand.guilds.forEach(guildId => {
                        if (!guildOnlyCommands[guildId])
                            guildOnlyCommands[guildId] = [];

                        guildOnlyCommands[guildId].push(applicationCommand);
                    });
                });

            return Promise.all([
                this.client.application?.commands
                    .set([], this.client.config.testGuildId)
                    .catch(error => {
                        if (error.code === 50001)
                            this.client.logger.error(
                                null,
                                `I encountered DiscordAPIError: Missing Access in the test guild [${this.client.config.testGuildId}] when trying to delete a non-existent application command.`
                            );
                        else {
                            Logger.error(error);
                            Logger.sentry.captureWithExtras(error, {
                                "Guild ID": this.client.config.testGuildId,
                                "Application Command Count":
                                    this.client.applicationCommands.size,
                                "Application Commands":
                                    this.client.applicationCommands
                            });
                        }
                    }),
                this.client.application?.commands.set(
                    this.client.applicationCommands
                        .filter(
                            applicationCommand =>
                                !applicationCommand.guilds.length
                        )
                        .map(applicationCommand => applicationCommand.options)
                ),
                Object.entries(guildOnlyCommands).map(([key, value]) =>
                    this.client.application?.commands.set(
                        value
                            .filter(
                                applicationCommand =>
                                    !applicationCommand.guilds.length
                            )
                            .map(
                                applicationCommand => applicationCommand.options
                            ),
                        key
                    )
                )
            ]);
        }

        return this.client.application?.commands.set(
            this.client.applicationCommands.map(
                applicationCommand => applicationCommand.options
            ),
            this.client.config.testGuildId
        );
    }

    /**
     * Reload all of the application commands.
     * @param register Whether or not to register the application commands after reloading them.
     * @returns The result of the registerApplicationCommands method if register is true, otherwise undefined.
     */
    public reloadApplicationCommands(register: boolean = true) {
        this.client.applicationCommands.clear();
        this.loadApplicationCommands();

        if (register) return this.registerApplicationCommands();
    }

    /**
     * Get an application command by its name.
     * @param name The name of the application command.
     * @returns The application command with the specified name if it exists, otherwise undefined.
     */
    private getApplicationCommand(name: string) {
        return this.client.applicationCommands.get(name);
    }

    /**
     * Handle an interaction properly to ensure that it can invoke an application command.
     * @param interaction The interaction that is attempting to invoke an application command.
     */
    public async handleApplicationCommand(interaction: CommandInteraction) {
        const userLanguage = await this.client.prisma.userLanguage.findUnique({
            where: {
                userId: interaction.user.id
            }
        });
        const language = this.client.languageHandler.getLanguage(
            userLanguage?.languageId || interaction.locale
        );

        const applicationCommand = this.getApplicationCommand(
            interaction.commandName
        );

        if (!applicationCommand) {
            this.client.logger.error(
                null,
                `${interaction.user.tag} [${interaction.user.id}] invoked application command ${interaction.commandName} but it does not exist.`
            );
            const sentryId =
                await this.client.logger.sentry.captureWithInteraction(
                    new Error("Non existent application command invoked."),
                    interaction as Interaction
                );

            await this.client.application?.commands
                .delete(
                    interaction.commandName,
                    process.env.NODE_ENV === "production"
                        ? this.client.config.testGuildId
                        : undefined
                )
                .catch(error => {
                    if (error.code === 50001)
                        this.client.logger.error(
                            null,
                            `I encountered DiscordAPIError: Missing Access in the test guild [${this.client.config.testGuildId}] when trying to delete a non-existent application command.`
                        );
                    else {
                        Logger.error(error);
                        Logger.sentry.captureWithExtras(error, {
                            "Guild ID": this.client.config.testGuildId,
                            "Application Command Count":
                                this.client.applicationCommands.size,
                            "Application Commands":
                                this.client.applicationCommands
                        });
                    }
                });

            return interaction.reply({
                embeds: [
                    {
                        title: language.get("NON_EXISTENT_TITLE"),
                        description: language.get("NON_EXISTENT_DESCRIPTION", {
                            name: interaction.commandName.toLowerCase(),
                            type:
                                interaction.commandType ===
                                ApplicationCommandType.ChatInput
                                    ? "slash command"
                                    : "context menu",
                            username: interaction.user.username
                        }),
                        footer: {
                            text: `Sentry Event ID: ${sentryId}`
                        },
                        color: this.client.config.colors.error
                    }
                ],
                ephemeral: true
            });
        }

        const missingPermissions = await applicationCommand.validate(
            interaction,
            language
        );
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

        const [preChecked, preCheckedResponse] =
            await applicationCommand.preCheck(interaction, language);
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

        return this.runApplicationCommand(
            applicationCommand,
            interaction,
            language
        );
    }

    /**
     * Run an application command.
     * @param applicationCommand The application command we want to run.
     * @param interaction The interaction that invoked the application command.
     * @param language The language to use when replying to the interaction.
     */
    private async runApplicationCommand(
        applicationCommand: ApplicationCommand,
        interaction: CommandInteraction,
        language: Language
    ) {
        if (this.cooldowns.has(interaction.user.id))
            return interaction.reply({
                embeds: [
                    {
                        title: language.get("COOLDOWN_ON_TYPE_TITLE", {
                            type:
                                applicationCommand.type ===
                                ApplicationCommandType.ChatInput
                                    ? "Slash Command"
                                    : "Context Menu"
                        }),
                        description: language.get(
                            "COOLDOWN_ON_TYPE_DESCRIPTION",
                            {
                                type:
                                    applicationCommand.type ===
                                    ApplicationCommandType.ChatInput
                                        ? "slash command"
                                        : "context menu"
                            }
                        ),
                        color: this.client.config.colors.error
                    }
                ],
                ephemeral: true
            });

        this.client.usersUsingBot.add(interaction.user.id);

        applicationCommand
            .run(interaction, language)
            .then(async () => {
                if (applicationCommand.cooldown)
                    await applicationCommand.applyCooldown(interaction.user.id);

                this.client.usersUsingBot.delete(interaction.user.id);
                this.client.metrics.incrementCommandUse(
                    applicationCommand.name,
                    applicationCommand.type === ApplicationCommandType.ChatInput
                        ? "slash"
                        : "context",
                    true,
                    this.client.shard?.ids[0] ?? 0
                );
            })
            .catch(async error => {
                this.client.metrics.incrementCommandUse(
                    applicationCommand.name,
                    applicationCommand.type === ApplicationCommandType.ChatInput
                        ? "slash"
                        : "context",
                    false,
                    this.client.shard?.ids[0] ?? 0
                );
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
                                    name: interaction.commandName.toLowerCase(),
                                    type:
                                        interaction.commandType ===
                                        ApplicationCommandType.ChatInput
                                            ? "slash command"
                                            : "context menu"
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

                if (interaction.isRepliable()) return interaction.reply(toSend);
                else return interaction.followUp(toSend);
            });

        this.cooldowns.add(interaction.user.id);
        setTimeout(
            () => this.cooldowns.delete(interaction.user.id),
            this.coolDownTime
        );
    }
}
