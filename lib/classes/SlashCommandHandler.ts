import { CommandInteraction, Snowflake } from "discord.js";
import SlashCommand from "./SlashCommand";
import BetterClient from "../extensions/BetterClient.js";

export default class SlashCommandHandler {
    /**
     * Our client.
     */
    private readonly client: BetterClient;

    /**
     * How long a user must wait between each slash command.
     */
    private readonly coolDownTime: number;

    /**
     * Our user's cooldowns.
     */
    private coolDowns: Set<Snowflake>;

    /**
     * Create our SlashCommandHandler.
     * @param client Our client.
     */
    constructor(client: BetterClient) {
        this.client = client;

        this.coolDownTime = 1000;
        this.coolDowns = new Set();
    }

    /**
     * Load all the slash commands in the slashCommands directory.
     */
    public loadSlashCommands() {
        this.client.functions
            .getFiles(
                `${this.client.__dirname}/dist/src/bot/slashCommands`,
                "",
                true
            )
            .forEach(parentFolder =>
                this.client.functions
                    .getFiles(
                        `${this.client.__dirname}/dist/src/bot/slashCommands/${parentFolder}`,
                        ".js"
                    )
                    .forEach(async fileName => {
                        const commandFile = await import(
                            `../../src/bot/slashCommands/${parentFolder}/${fileName}`
                        );
                        // eslint-disable-next-line new-cap
                        const command: SlashCommand = new commandFile.default(
                            this.client
                        );
                        return this.client.slashCommands.set(
                            command.name,
                            command
                        );
                    })
            );
        return setTimeout(async () => {
            const developmentGuild = this.client.guilds.cache.get(
                process.env.DEVELOPMENT_GUILD_ID || ""
            );

            if (process.env.NODE_ENV === "production") {
                this.client.application?.commands.set(
                    this.client.slashCommands.map(command => {
                        return {
                            name: command.name,
                            description: command.description,
                            options: command.options
                        };
                    })
                );

                if (developmentGuild)
                    developmentGuild.commands.set([]).catch(error => {
                        if (error.code === 50001)
                            this.client.logger.error(
                                null,
                                `I encountered DiscordAPIError: Missing Access in ${developmentGuild.name} [${developmentGuild.id}] when trying to clear slash commands!`
                            );
                        else {
                            this.client.logger.error(error);
                            this.client.logger.sentry.captureWithExtras(error, {
                                Guild: developmentGuild.name,
                                "Guild ID": developmentGuild.id,
                                "Slash Command Count":
                                    this.client.slashCommands.size,
                                "Slash Commands": this.client.slashCommands.map(
                                    command => {
                                        return {
                                            name: command.name,
                                            description: command.description,
                                            options: command.options
                                        };
                                    }
                                )
                            });
                        }
                    });
            } else if (developmentGuild)
                developmentGuild.commands
                    .set(
                        this.client.slashCommands.map(slashCommand => ({
                            name: slashCommand.name,
                            description: slashCommand.description,
                            options: slashCommand.options
                        }))
                    )
                    .catch(error => {
                        if (error.code === 50001)
                            this.client.logger.error(
                                null,
                                `I encountered DiscordAPIError: Missing Access in ${developmentGuild.name} [${developmentGuild.id}] when trying to set slash commands!`
                            );
                        else {
                            this.client.logger.error(error);
                            this.client.logger.sentry.captureWithExtras(error, {
                                Guild: developmentGuild.name,
                                "Guild ID": developmentGuild.id,
                                "Slash Command Count":
                                    this.client.slashCommands.size,
                                "Slash Commands": this.client.slashCommands.map(
                                    command => {
                                        return {
                                            name: command.name,
                                            description: command.description,
                                            options: command.options
                                        };
                                    }
                                )
                            });
                        }
                    });
        }, 5000);
    }

    /**
     * Reload all the slash commands in the slashCommands directory.
     */
    public reloadSlashCommands() {
        this.client.slashCommands.clear();
        this.loadSlashCommands();
    }

    /**
     * Fetch the slash command that has the provided name.
     * @param name The name to search for.
     * @return The slash command we've found.
     */
    private fetchCommand(name: string): SlashCommand | undefined {
        return this.client.slashCommands.get(name);
    }

    /**
     * Handle the interaction created for this slash command to make sure the user and client can execute it.
     * @param interaction The interaction created.
     */
    public async handleCommand(interaction: CommandInteraction) {
        const command = this.fetchCommand(interaction.commandName);
        if (!command) {
            this.client.logger.error(
                `${interaction.user.tag} [${interaction.user.id}] invoked slash command ${interaction.commandName} even though it doesn't exist.`
            );
            const sentryId =
                await this.client.logger.sentry.captureWithInteraction(
                    new Error(`Non existent slash command invoked`),
                    interaction
                );
            if (process.env.NODE_ENV === "production")
                this.client.application?.commands.delete(
                    interaction.commandName
                );
            else
                await Promise.all(
                    this.client.guilds.cache.map(guild =>
                        guild.commands
                            .delete(interaction.commandName)
                            .catch(error => {
                                if (error.code === 50001)
                                    this.client.logger.error(
                                        null,
                                        `I encountered DiscordAPIError: Missing Access in ${guild.name} [${guild.id}] when trying to delete a slash command!`
                                    );
                                else {
                                    this.client.logger.error(error);
                                    this.client.logger.sentry.captureWithExtras(
                                        error,
                                        {
                                            Guild: guild.name,
                                            "Guild ID": guild.id,
                                            "Slash Command Count":
                                                this.client.slashCommands.size,
                                            "Slash Commands":
                                                this.client.slashCommands.map(
                                                    cmd => {
                                                        return {
                                                            name: cmd.name,
                                                            description:
                                                                cmd.description,
                                                            options: cmd.options
                                                        };
                                                    }
                                                )
                                        }
                                    );
                                }
                            })
                    )
                );
            return interaction.reply(
                this.client.functions.generateErrorMessage(
                    {
                        title: "Non Existent Command",
                        description: `The command \`${interaction.commandName}\` doesn't exist on this instance of ${this.client.user?.username}, this has already been reported to my developers and the command has been removed!`,
                        footer: { text: `Sentry Event ID: ${sentryId} ` }
                    },
                    true
                )
            );
        }

        if (
            process.env.NODE_ENV === "development" &&
            !this.client.functions.isAdmin(interaction.user.id)
        )
            return;

        const missingPermissions = await command.validate(interaction);
        if (missingPermissions)
            return interaction.reply(
                this.client.functions.generateErrorMessage(missingPermissions)
            );

        const preChecked = await command.preCheck(interaction);
        if (!preChecked[0]) {
            if (preChecked[1])
                await interaction.reply(
                    this.client.functions.generateErrorMessage(preChecked[1])
                );
            return;
        }

        return this.runCommand(command, interaction);
    }

    /**
     * Execute our slash command.`
     * @param command The slash command we want to execute.
     * @param interaction The interaction that was created for our slash command.
     */
    private async runCommand(
        command: SlashCommand,
        interaction: CommandInteraction
    ): Promise<any> {
        if (this.coolDowns.has(interaction.user.id))
            return interaction.reply(
                this.client.functions.generateErrorMessage({
                    title: "Command Cooldown",
                    description:
                        "Please wait a second before running this command again!"
                })
            );

        this.client.usersUsingBot.add(interaction.user.id);
        command
            .run(interaction)
            .then(async () => {
                if (command.cooldown)
                    await command.applyCooldown(interaction.user.id);
                this.client.usersUsingBot.delete(interaction.user.id);
                this.client.dataDog.increment("slashCommandUsage", 1, [
                    `command:${command.name}`
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
                        description: `An unexpected error was encountered while running \`${interaction.commandName}\`, my developers have already been notified! Feel free to join my support server in the mean time!`,
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

