/* eslint-disable no-console */

import { WebhookClient, WebhookCreateMessageOptions } from "discord.js";
import {
    bgGreenBright,
    bgMagentaBright,
    bgRedBright,
    bgYellowBright,
    bold
} from "colorette";
import { format } from "util";
import init from "../utilities/sentry.js";

export class Logger {
    /** Our Sentry client. */
    public readonly sentry;

    /** A Map<string, WebhookClient> whose key value pair correlates to the type of log we want and the WebhookClient for the log. */
    private readonly webhooks: Map<string, WebhookClient>;

    /**
     * Create our logger.
     */
    constructor() {
        this.sentry = init();
        this.webhooks = new Map();
    }

    /**
     * Get the current timestamp.
     * @returns The current timestamp in the format of MM/DD/YYYY @ HH:mm:SS.
     */
    public get timestamp(): string {
        const nowISOString = new Date().toISOString();
        const [year, month, day] = nowISOString.substr(0, 10).split("-");
        return `${month}/${day}/${year} @ ${nowISOString.substr(11, 8)}`;
    }

    /**
     * Log out a debug statement.
     * @param args The arguments to log out.
     */
    public debug(...args: string | any): void {
        console.log(
            bold(bgMagentaBright(`[${this.timestamp}]`)),
            bold(format(...args))
        );
    }

    /**
     * Log out an info statement.
     * @param args The arguments to log out.
     */
    public info(...args: string | any): void {
        console.log(
            bold(bgGreenBright(`[${this.timestamp}]`)),
            bold(format(...args))
        );
    }

    /**
     * Log out a warn statement.
     * @param args The arguments to log out.
     */
    public warn(...args: string | any): void {
        console.log(
            bold(bgYellowBright(`[${this.timestamp}]`)),
            bold(format(...args))
        );
    }

    /**
     * Log out an error statement.
     * @param args The arguments to log out.
     */
    public error(error: any | null, ...args: string | any): void {
        if (error)
            console.log(
                bold(bgRedBright(`[${this.timestamp}]`)),
                error,
                bold(format(...args))
            );
        else
            console.log(
                bold(bgRedBright(`[${this.timestamp}]`)),
                bold(format(...args))
            );
    }

    /**
     * Log a message to Discord through a webhook.
     * @param type The webhook type to log out to, make sure that the webhook provided in your .env file is in the format ${TYPE}_HOOK=...
     * @param options The options for the message we want to send with the webhook.
     * @returns The message that was sent.
     */
    public async webhookLog(
        type: string,
        options: WebhookCreateMessageOptions
    ) {
        if (!type) throw new Error("No webhook type has been provided!");
        else if (!this.webhooks.get(type.toLowerCase())) {
            const webhookURL = process.env[`${type.toUpperCase}_HOOK`];
            if (!webhookURL)
                throw new Error(
                    `No webhook URL has been provided for ${type}!`
                );

            this.webhooks.set(
                type.toLowerCase(),
                new WebhookClient({ url: webhookURL })
            );
        }

        // We use ! here as if the webhook doesn't exist, we throw an error above.
        return this.webhooks.get(type.toLowerCase())!.send(options);
    }
}

export default new Logger();
