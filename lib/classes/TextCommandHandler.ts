import { Message } from "discord.js";
import Language from "./Language.js";
import TextCommand from "./TextCommand";
import ExtendedClient from "../extensions/ExtendedClient.js";

export default class TextCommandHandler {
    /** Our extended client. */
    public readonly client: ExtendedClient;

    /** How long a user must wait before being able to run a text command again. */
    public readonly coolDownTime: number;

    /** A list of user IDs that currently have a cooldown applied. */
    public readonly cooldowns: Set<string>;

    /**
     * Create our text command handler.
     * @param client Our extended client.
     */
    constructor(client: ExtendedClient) {
        this.client = client;

        this.coolDownTime = 200;
        this.cooldowns = new Set();
    }

    /**
     * Load all of the text commands in the textCommands directory.
     */
    public loadTextCommands() {
        this.client.functions
            .getFiles(
                `${this.client.__dirname}/dist/src/bot/textCommands`,
                "",
                true
            )
            .forEach(parentFolder =>
                this.client.functions
                    .getFiles(
                        `${this.client.__dirname}/dist/src/bot/textCommands/${parentFolder}`,
                        ".js"
                    )
                    .forEach(async fileName => {
                        const CommandFile = await import(
                            `../../src/bot/textCommands/${parentFolder}/${fileName}`
                        );

                        // @ts-ignore
                        const command = new CommandFile.default(
                            this.client
                        ) as TextCommand;

                        return this.client.textCommands.set(
                            command.name,
                            command
                        );
                    })
            );
    }

    /**
     * Reload all of the text commands.
     */
    public reloadTextCommands() {
        this.client.textCommands.clear();
        this.loadTextCommands();
    }

    /**
     * Get a text command by its name.
     * @param name The name of the text command.
     * @returns The text command with the specified name if it exists, otherwise undefined.
     */
    private getTextCommand(name?: string) {
        return this.client.textCommands.get(name || "");
    }

    /**
     * Handle an interaction properly to ensure that it can invoke an application command.
     * @param interaction The interaction that is attempting to invoke an application command.
     */
    public async handleTextCommand(message: Message) {
        const validPrefix = this.client.config.prefixes.find(prefix =>
            message.content.startsWith(prefix)
        );
        if (!validPrefix) return;

        const userLanguage = await this.client.prisma.userLanguage.findUnique({
            where: {
                userId: message.author.id
            }
        });
        const language = this.client.languageHandler.getLanguage(
            userLanguage?.languageId
        );

        const textCommandArguments = message.content
            .slice(validPrefix.length)
            .trim()
            .split(/ +/g);
        const textCommandName = textCommandArguments.shift()?.toLowerCase();
        const textCommand = this.getTextCommand(textCommandName);
        if (!textCommand) return;

        const missingPermissions = await textCommand.validate(
            message,
            language
        );
        if (missingPermissions)
            return message.reply({
                embeds: [
                    {
                        ...missingPermissions,
                        color: this.client.config.colors.error
                    }
                ]
            });

        const [preChecked, preCheckedResponse] = await textCommand.preCheck(
            message,
            language
        );
        if (!preChecked) {
            if (preCheckedResponse) {
                return message.reply({
                    embeds: [
                        {
                            ...preCheckedResponse,
                            color: this.client.config.colors.error
                        }
                    ]
                });
            }
            return;
        }

        return this.runTextCommand(
            textCommand,
            message,
            language,
            textCommandArguments
        );
    }

    /**
     * Run a text command.
     * @param applicationCommand The application command we want to run.
     * @param interaction The interaction that invoked the application command.
     * @param language The language to use when replying to the interaction.
     */
    private async runTextCommand(
        textCommand: TextCommand,
        message: Message,
        language: Language,
        args: string[]
    ) {
        if (this.cooldowns.has(message.author.id))
            return message.reply({
                embeds: [
                    {
                        title: language.get("COOLDOWN_ON_TYPE_TITLE", {
                            type: "Command"
                        }),
                        description: language.get(
                            "COOLDOWN_ON_TYPE_DESCRIPTION",
                            { type: "command" }
                        ),
                        color: this.client.config.colors.error
                    }
                ]
            });

        this.client.usersUsingBot.add(message.author.id);

        textCommand
            .run(message, language, args)
            .then(async () => {
                if (textCommand.cooldown)
                    await textCommand.applyCooldown(message.author.id);

                this.client.usersUsingBot.delete(message.author.id);
                // TODO: Implement Grafana or Datadog and add metrics here.
                this.client.metrics.incrementCommandUse(
                    textCommand.name,
                    "text",
                    true,
                    this.client.shard?.ids[0] ?? 0
                );
            })
            .catch(async error => {
                this.client.metrics.incrementCommandUse(
                    textCommand.name,
                    "text",
                    false,
                    this.client.shard?.ids[0] ?? 0
                );
                this.client.logger.error(error);

                const sentryId =
                    await this.client.logger.sentry.captureWithMessage(
                        error,
                        message
                    );

                return message.reply({
                    embeds: [
                        {
                            title: language.get("AN_ERROR_HAS_OCCURRED_TITLE"),
                            description: language.get(
                                "AN_ERROR_HAS_OCCURRED_DESCRIPTION",
                                {
                                    name: textCommand.name.toLowerCase(),
                                    type: "text command"
                                }
                            ),
                            footer: {
                                text: `Sentry Event ID: ${sentryId}}`
                            },
                            color: this.client.config.colors.error
                        }
                    ]
                });
            });

        this.cooldowns.add(message.author.id);
        setTimeout(
            () => this.cooldowns.delete(message.author.id),
            this.coolDownTime
        );
    }
}
