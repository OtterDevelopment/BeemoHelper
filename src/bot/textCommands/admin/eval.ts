import { MessageEmbedOptions, Team, User } from "discord.js";
import { inspect } from "util";
import TextCommand from "../../../../lib/classes/TextCommand.js";
import BetterClient from "../../../../lib/extensions/BetterClient.js";
import BetterMessage from "../../../../lib/extensions/BetterMessage.js";

export default class Eval extends TextCommand {
    constructor(client: BetterClient) {
        super("eval", client, {
            description: "Evaluates arbitrary JavaScript code.",
            devOnly: true
        });
    }

    override async preCheck(
        message: BetterMessage
    ): Promise<[boolean, MessageEmbedOptions?]> {
        await this.client.application?.fetch();
        return [
            (this.client.config.admins.includes(message.author.id) &&
                this.client.application?.owner instanceof User &&
                this.client.application?.owner.id === message.author.id) ||
                (this.client.application?.owner instanceof Team &&
                    this.client.application?.owner.members.has(
                        message.author.id
                    ))
        ];
    }

    override async run(message: BetterMessage, args: string[]) {
        this.client.logger.info(
            `${message.author.tag} ran eval in ${message.guild?.name} ${
                message.guild?.id
            }, ${args.join(" ")}`
        );
        try {
            const code = args.join(" ");
            // eslint-disable-next-line no-eval
            const evaled = eval(code);

            if (evaled instanceof Promise) {
                const start = Date.now();
                return await Promise.all([
                    message.reply({ content: "♨️Running..." }),
                    evaled
                ])
                    .then(async ([msg, output]) => {
                        msg.edit({
                            content: `🆗 Evaluated successfully \`(${
                                Date.now() - start
                            }ms)\`. ${await this.client.functions.uploadHaste(
                                this.parseContent(
                                    typeof output !== "string"
                                        ? inspect(output)
                                        : output
                                ),
                                "ts"
                            )}`
                        });
                    })
                    .catch(async error => {
                        return message.reply({
                            content: `🆘 JavaScript failed. ${await this.client.functions.uploadHaste(
                                this.parseContent(
                                    typeof error !== "string"
                                        ? inspect(error)
                                        : error
                                ),
                                "ts"
                            )}`
                        });
                    });
            }

            return await message.reply({
                content: `🆗 Evaluated successfully. ${await this.client.functions.uploadHaste(
                    this.parseContent(
                        typeof evaled !== "string" ? inspect(evaled) : evaled
                    ),
                    "ts"
                )}`
            });
        } catch (error) {
            return await message.reply({
                content: `🆘 JavaScript failed. ${await this.client.functions.uploadHaste(
                    this.parseContent(
                        typeof error !== "string" ? inspect(error) : error
                    ),
                    "ts"
                )}`
            });
        }
    }

    /**
     * Parse the content of a string to remove all private information.
     * @param content The content to parse.
     * @returns The parsed content.
     * @private
     */
    private parseContent(content: string): string {
        return (
            content
                .replace(this.client.token || "", "[ T O K E N ]")
                // @ts-ignore
                .replace(this.client.mongo.s.url, "[ M O N G O ]")
                .replace(
                    this.client.mongo.options.credentials?.password || "",
                    "[ M O N G O P A S S ]"
                )
                .replace(
                    this.client.mongo.options.srvHost || "",
                    "[ M O N G O H O S T ]"
                )
                .replace(
                    this.client.config.dataDog.apiKey || "",
                    "[ D A T A D O G A P I K E Y ]"
                )
        );
    }
}
