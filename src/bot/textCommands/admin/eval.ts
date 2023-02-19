import { inspect } from "util";
import { Message } from "discord.js";
import Type from "../../../../lib/classes/Type.js";
import Language from "../../../../lib/classes/Language.js";
import StopWatch from "../../../../lib/classes/StopWatch.js";
import TextCommand from "../../../../lib/classes/TextCommand.js";
import ExtendedClient from "../../../../lib/extensions/ExtendedClient.js";

export default class Eval extends TextCommand {
    /**
     * Create our eval command.
     * @param client Our extended client.
     */
    constructor(client: ExtendedClient) {
        super(client, {
            name: "eval",
            description: "Evaluates arbitrary JavaScript code.",
            devOnly: true
        });
    }

    /**
     * Run this text command.
     * @param message The message that invoked this text command.
     * @param _language The language to use when replying to the message.
     * @param args The arguments to use when running this text command.
     */
    override async run(message: Message, _language: Language, args: string[]) {
        this.client.logger.info(
            `${message.author.tag} ran eval in ${message.guild?.name} ${
                message.guild?.id
            }, ${args.join(" ")}`
        );

        const { success, result, time, type } = await this.eval(
            message,
            args.join(" ")
        );
        if (message.content.includes("--silent")) return null;

        if (result.length > 4087)
            return message.reply({
                embeds: [
                    {
                        title: success
                            ? "🆗 Evaluated successfully."
                            : "🆘 JavaScript failed.",
                        description: `Output too long for Discord, view it [here](${await this.client.functions.uploadToHastebin(
                            result,
                            { type: "ts" }
                        )}).`,
                        fields: [
                            {
                                name: "Type",
                                value: `\`\`\`ts\n${type}\`\`\`\n${time}`
                            }
                        ],
                        color: success
                            ? this.client.config.colors.success
                            : this.client.config.colors.error
                    }
                ]
            });

        return message.reply({
            embeds: [
                {
                    title: success
                        ? "🆗 Evaluated successfully."
                        : "🆘 JavaScript failed.",
                    description: `\`\`\`js\n${result}\`\`\``,
                    fields: [
                        {
                            name: "Type",
                            value: `\`\`\`ts\n${type}\`\`\`\n${time}`
                        }
                    ],
                    color: success
                        ? this.client.config.colors.success
                        : this.client.config.colors.error
                }
            ]
        });
    }

    private async eval(message: Message, code: string) {
        code = code.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
        const stopwatch = new StopWatch();
        let success;
        let syncTime;
        let asyncTime;
        let result;
        let thenable = false;
        let type;
        try {
            if (message.content.includes("--async"))
                code = `(async () => {\n${code}\n})();`;
            // eslint-disable-next-line no-eval
            result = eval(code);
            syncTime = stopwatch.toString();
            type = new Type(result);
            if (this.client.functions.isThenable(result)) {
                thenable = true;
                stopwatch.restart();
                result = await result;
                asyncTime = stopwatch.toString();
                type.addValue(result);
            }
            success = true;
        } catch (error: any) {
            if (!syncTime) syncTime = stopwatch.toString();
            if (!type) type = new Type(error);
            if (thenable && !asyncTime) asyncTime = stopwatch.toString();
            if (error && error.stack) this.client.emit("error", error.stack);
            result = error;
            success = false;
        }

        stopwatch.stop();
        return {
            success,
            type,
            time: this.formatTime(syncTime, asyncTime),
            result: this.parseContent(inspect(result))
        };
    }

    /**
     * Parse the content of a string to remove all private information.
     * @param content The content to parse.
     * @returns The parsed content.
     */
    private parseContent(content: string): string {
        return content.replace(this.client.token || "", "[ T O K E N ]");
    }

    private formatTime(syncTime: string, asyncTime?: string) {
        return asyncTime ? `⏱ ${asyncTime}<${syncTime}>` : `⏱ ${syncTime}`;
    }
}

