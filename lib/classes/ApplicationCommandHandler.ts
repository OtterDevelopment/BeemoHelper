import {
    APIApplicationCommandInteraction,
    ApplicationCommandType,
    MessageFlags,
    RESTJSONErrorCodes,
    RESTPostAPIWebhookWithTokenJSONBody,
    WithIntrinsicProps
} from "@discordjs/core";
import { DiscordAPIError } from "@discordjs/rest";
import Language from "./Language.js";
import ApplicationCommand from "./ApplicationCommand.js";
import ExtendedClient from "../extensions/ExtendedClient.js";

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
            const guildOnlyCommands: Map<string, ApplicationCommand[]> =
                new Map();

            [...this.client.applicationCommands.values()]
                .filter(applicationCommand => applicationCommand.guilds.length)
                .forEach(applicationCommand => {
                    applicationCommand.guilds.forEach(guildId =>
                        guildOnlyCommands.set(
                            guildId,
                            (guildOnlyCommands.get(guildId) || []).concat([
                                applicationCommand
                            ])
                        )
                    );
                });

            return Promise.all([
                this.client.api.applicationCommands
                    .bulkOverwriteGuildCommands(
                        process.env.APPLICATION_ID,
                        this.client.config.testGuildId,
                        []
                    )
                    .catch(async error => {
                        if (error instanceof DiscordAPIError)
                            if (error.code === RESTJSONErrorCodes.MissingAccess)
                                this.client.logger.error(
                                    null,
                                    `I encountered DiscordAPIError: Missing Access in ${this.client.config.testGuildId} when trying to clear application commands in the test guild.`
                                );

                        await this.client.logger.sentry.captureWithExtras(
                            error,
                            {
                                "Guild ID": this.client.config.testGuildId,
                                "Application Command Count":
                                    this.client.applicationCommands.size,
                                "Application Commands":
                                    this.client.applicationCommands
                            }
                        );
                        throw error;
                    }),
                this.client.api.applicationCommands.bulkOverwriteGlobalCommands(
                    process.env.APPLICATION_ID,
                    [...this.client.applicationCommands.values()]
                        .filter(
                            applicationCommand =>
                                !applicationCommand.guilds.length
                        )
                        .map(applicationCommand => applicationCommand.options)
                ),
                [...guildOnlyCommands.entries()].map(
                    ([guildId, applicationCommands]) =>
                        this.client.api.applicationCommands
                            .bulkOverwriteGuildCommands(
                                process.env.APPLICATION_ID,
                                guildId,
                                applicationCommands.map(
                                    applicationCommand =>
                                        applicationCommand.options
                                )
                            )
                            .catch(async error => {
                                if (error instanceof DiscordAPIError)
                                    if (
                                        error.code ===
                                        RESTJSONErrorCodes.MissingAccess
                                    )
                                        this.client.logger.error(
                                            null,
                                            `I encountered DiscordAPIError: Missing Access in ${this.client.config.testGuildId} when trying to set guild commands.`
                                        );

                                await this.client.logger.sentry.captureWithExtras(
                                    error,
                                    {
                                        "Guild ID":
                                            this.client.config.testGuildId,
                                        "Application Command Count":
                                            this.client.applicationCommands
                                                .size,
                                        "Application Commands":
                                            this.client.applicationCommands
                                    }
                                );
                                throw error;
                            })
                )
            ]);
        }

        return this.client.api.applicationCommands
            .bulkOverwriteGuildCommands(
                process.env.APPLICATION_ID,
                this.client.config.testGuildId,
                [...this.client.applicationCommands.values()].map(
                    applicationCommand => applicationCommand.options
                )
            )
            .catch(async error => {
                if (error instanceof DiscordAPIError)
                    if (error.code === RESTJSONErrorCodes.MissingAccess)
                        this.client.logger.error(
                            null,
                            `I encountered DiscordAPIError: Missing Access in ${this.client.config.testGuildId} when trying to set application commands in the test guild.`
                        );

                await this.client.logger.sentry.captureWithExtras(error, {
                    "Guild ID": this.client.config.testGuildId,
                    "Application Command Count":
                        this.client.applicationCommands.size,
                    "Application Commands": this.client.applicationCommands
                });
                throw error;
            });
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
    public async handleApplicationCommand({
        data: interaction,
        shardId
    }: Omit<WithIntrinsicProps<APIApplicationCommandInteraction>, "api">) {
        const userLanguage = await this.client.prisma.userLanguage.findUnique({
            where: {
                userId: (interaction.member?.user ?? interaction.user!).id
            }
        });
        const language = this.client.languageHandler.getLanguage(
            userLanguage?.languageId || interaction.locale
        );

        const applicationCommand = this.getApplicationCommand(
            interaction.data.name
        );

        if (!applicationCommand) {
            this.client.logger.error(
                null,
                `${(interaction.member?.user ?? interaction.user!).username}#${
                    (interaction.member?.user ?? interaction.user!)
                        .discriminator
                } [${
                    (interaction.member?.user ?? interaction.user!).id
                }] invoked application command ${
                    interaction.data.name
                } but it does not exist.`
            );
            const eventId =
                await this.client.logger.sentry.captureWithInteraction(
                    new Error("Non existent application command invoked."),
                    interaction
                );

            try {
                if (process.env.NODE_ENV === "production")
                    await this.client.api.applicationCommands.deleteGlobalCommand(
                        interaction.application_id,
                        interaction.data.id
                    );
                else
                    await this.client.api.applicationCommands.deleteGuildCommand(
                        interaction.application_id,
                        interaction.data.id,
                        interaction.guild_id ?? this.client.config.testGuildId
                    );
            } catch (error) {
                if (error instanceof DiscordAPIError)
                    if (error.code === RESTJSONErrorCodes.MissingAccess)
                        this.client.logger.error(
                            null,
                            `I encountered DiscordAPIError: Missing Access in the test guild [${this.client.config.testGuildId}] when trying to delete a non-existent application command.`
                        );

                await this.client.logger.sentry.captureWithExtras(error, {
                    "Guild ID": this.client.config.testGuildId,
                    "Application Command Count":
                        this.client.applicationCommands.size,
                    "Application Commands": this.client.applicationCommands
                });
                throw error;
            }

            return this.client.api.interactions.reply(
                interaction.id,
                interaction.token,
                {
                    embeds: [
                        {
                            title: language.get(
                                "NON_EXISTENT_APPLICATION_COMMAND_TITLE",
                                {
                                    type:
                                        interaction.data.type ===
                                        ApplicationCommandType.ChatInput
                                            ? "Slash Command"
                                            : "Context Menu"
                                }
                            ),
                            description: language.get(
                                "NON_EXISTENT_APPLICATION_COMMAND_DESCRIPTION",
                                {
                                    name: interaction.data.name,
                                    type:
                                        interaction.data.type ===
                                        ApplicationCommandType.ChatInput
                                            ? "slash command"
                                            : "context menu",
                                    username: (
                                        interaction.member?.user ??
                                        interaction.user!
                                    ).username
                                }
                            ),
                            footer: {
                                text: language.get("SENTRY_EVENT_ID_FOOTER", {
                                    eventId
                                })
                            },
                            color: this.client.config.colors.error
                        }
                    ],
                    flags: MessageFlags.Ephemeral
                }
            );
        }

        const missingPermissions = await applicationCommand.validate({
            interaction,
            language,
            shardId
        });
        if (missingPermissions)
            return this.client.api.interactions.reply(
                interaction.id,
                interaction.token,
                {
                    embeds: [
                        {
                            ...missingPermissions,
                            color: this.client.config.colors.error
                        }
                    ],
                    flags: MessageFlags.Ephemeral
                }
            );

        const [preChecked, preCheckedResponse] =
            await applicationCommand.preCheck({
                interaction,
                language,
                shardId
            });
        if (!preChecked) {
            if (preCheckedResponse)
                await this.client.api.interactions.reply(
                    interaction.id,
                    interaction.token,
                    {
                        embeds: [
                            {
                                ...preCheckedResponse,
                                color: this.client.config.colors.error
                            }
                        ],
                        flags: MessageFlags.Ephemeral
                    }
                );

            return;
        }

        return this.runApplicationCommand(
            applicationCommand,
            interaction,
            shardId,
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
        interaction: APIApplicationCommandInteraction,
        shardId: number,
        language: Language
    ) {
        if (
            this.cooldowns.has(
                (interaction.member?.user ?? interaction.user!).id
            )
        )
            return this.client.api.interactions.reply(
                interaction.id,
                interaction.token,
                {
                    embeds: [
                        {
                            title: language.get("COOLDOWN_ON_TYPE_TITLE", {
                                type:
                                    applicationCommand.type ===
                                    ApplicationCommandType.ChatInput
                                        ? "Slash Commands"
                                        : "Context Menus"
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
                    flags: MessageFlags.Ephemeral
                }
            );

        applicationCommand
            .run({ interaction, language, shardId })
            .then(async () => {
                if (applicationCommand.cooldown)
                    await applicationCommand.applyCooldown(
                        (interaction.member?.user ?? interaction.user!).id
                    );

                this.client.submitMetric("commands_used", "inc", 1, {
                    command: applicationCommand.name,
                    type:
                        applicationCommand.type ===
                        ApplicationCommandType.ChatInput
                            ? "slash"
                            : "context",
                    success: "true",
                    shard: shardId.toString()
                });
            })
            .catch(async error => {
                this.client.submitMetric("commands_used", "inc", 1, {
                    command: applicationCommand.name,
                    type:
                        applicationCommand.type ===
                        ApplicationCommandType.ChatInput
                            ? "slash"
                            : "context",
                    success: "false",
                    shard: shardId.toString()
                });
                this.client.logger.error(error);

                const eventId =
                    await this.client.logger.sentry.captureWithInteraction(
                        error,
                        interaction
                    );

                const toSend = {
                    embeds: [
                        {
                            title: language.get("AN_ERROR_HAS_OCCURRED_TITLE"),
                            description: language.get(
                                "AN_ERROR_HAS_OCCURRED_DESCRIPTION"
                            ),
                            footer: {
                                text: language.get("SENTRY_EVENT_ID_FOOTER", {
                                    eventId
                                })
                            },
                            color: this.client.config.colors.error
                        }
                    ],
                    flags: MessageFlags.Ephemeral
                } satisfies RESTPostAPIWebhookWithTokenJSONBody;

                try {
                    return await this.client.api.interactions.reply(
                        interaction.id,
                        interaction.token,
                        toSend
                    );
                } catch (err) {
                    if (
                        err instanceof DiscordAPIError &&
                        err.code ===
                            RESTJSONErrorCodes.InteractionHasAlreadyBeenAcknowledged
                    )
                        return this.client.api.interactions.followUp(
                            interaction.application_id,
                            interaction.token,
                            toSend
                        );

                    await this.client.logger.sentry.captureWithInteraction(
                        err,
                        interaction
                    );
                    throw err;
                }
            });

        this.cooldowns.add((interaction.member?.user ?? interaction.user!).id);
        setTimeout(
            () =>
                this.cooldowns.delete(
                    (interaction.member?.user ?? interaction.user!).id
                ),
            this.coolDownTime
        );
    }
}
