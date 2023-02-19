import { existsSync, mkdirSync, readdirSync } from "fs";
import Language from "../classes/Language.js";
import Config from "../../config/bot.config.js";
import ExtendedClient from "../extensions/ExtendedClient.js";
import Logger from "../classes/Logger.js";

export default class Functions {
    /** Our extended client. */
    private client: ExtendedClient;

    /** One second in milliseconds. */
    private SEC = 1e3;

    /** One minute in milliseconds. */
    private MIN = this.SEC * 60;

    /** One hour in milliseconds. */
    private HOUR = this.MIN * 60;

    /** One day in milliseconds. */
    private DAY = this.HOUR * 24;

    /** One year in milliseconds. */
    private YEAR = this.DAY * 365.25;

    constructor(client: ExtendedClient) {
        this.client = client;
    }

    /**
     * Get all of the files in a directory.
     * @param directory The directory to get all of the files from.
     * @param fileExtension The file extension to search for, leave blank to get all files.
     * @param createDirectoryIfNotFound Whether or not the directory we want to search for should be created if it doesn't already exist.
     * @returns The files within the directory.
     */
    public getFiles(
        directory: string,
        fileExtension: string,
        createDirectoryIfNotFound: boolean = false
    ) {
        if (createDirectoryIfNotFound && !existsSync(directory))
            mkdirSync(directory);

        return readdirSync(directory).filter(file =>
            file.endsWith(fileExtension)
        );
    }

    /**
     * Parses the input string, returning the number of milliseconds.
     * @param input The human-readable time string; eg: 10min, 10m, 10 minutes.
     * @param language The language to use for the parsing.
     * @returns The parsed value.
     */
    public parse(input: string, language?: Language) {
        if (!language)
            language = this.client.languageHandler.getLanguage("en-US");

        const RGX = language.get("PARSE_REGEX");
        const arr = input.toLowerCase().match(RGX);
        let num: number;
        // eslint-disable-next-line no-cond-assign
        if (arr != null && (num = parseFloat(arr[1]))) {
            if (arr[3] != null) return num * this.SEC;
            if (arr[4] != null) return num * this.MIN;
            if (arr[5] != null) return num * this.HOUR;
            if (arr[6] != null) return num * this.DAY;
            if (arr[7] != null) return num * this.DAY * 7;
            if (arr[8] != null) return num * this.YEAR;
            return num;
        }
    }

    private _format(
        value: number,
        prefix: string,
        type: "ms" | "second" | "minute" | "hour" | "day" | "year",
        long: boolean,
        language: Language
    ) {
        const number = (value | 0) === value ? value : ~~(value + 0.5);

        if (type === "ms") return `${prefix + number}ms`;

        return (
            prefix +
            number +
            (long
                ? ` ${language.get(
                      (number === 1
                          ? `${type}_ONE`
                          : `${type}_OTHER`
                      ).toUpperCase() as Uppercase<
                          `${typeof type}_ONE` | `${typeof type}_OTHER`
                      >
                  )}`
                : language.get(
                      `${type}_SHORT`.toUpperCase() as Uppercase<`${typeof type}_SHORT`>
                  ))
        );
    }

    /**
     * Formats the millisecond count to a human-readable time string.
     * @param milli The number of milliseconds.
     * @param long Whether or not the output should use the interval's long/full form; eg hour or hours instead of h.
     * @param language The language to use for formatting.
     * @returns The formatting count.
     */
    public format(milli: number, long: boolean = true, language?: Language) {
        if (!language) language = this.client.languageHandler.defaultLanguage!;

        const prefix = milli < 0 ? "-" : "";
        const abs = milli < 0 ? -milli : milli;

        if (abs < this.SEC) return milli + (long ? " ms" : "ms");
        if (abs < this.MIN)
            return this._format(
                abs / this.SEC,
                prefix,
                "second",
                long,
                language
            );
        if (abs < this.HOUR)
            return this._format(
                abs / this.MIN,
                prefix,
                "minute",
                long,
                language
            );
        if (abs < this.DAY)
            return this._format(
                abs / this.HOUR,
                prefix,
                "hour",
                long,
                language
            );
        if (abs < this.YEAR)
            return this._format(abs / this.DAY, prefix, "day", long, language);

        return this._format(abs / this.YEAR, prefix, "year", long, language);
    }

    /**
     * Generate a unix timestamp for Discord to be rendered locally per user.
     * @param options The options to use for the timestamp.
     * @return The generated timestamp.
     */
    public generateTimestamp(options?: {
        timestamp?: Date | number;
        type?: "t" | "T" | "d" | "D" | "f" | "F" | "R";
    }): string {
        let timestamp = options?.timestamp || new Date();
        const type = options?.type || "f";
        if (timestamp instanceof Date) timestamp = timestamp.getTime();
        return `<t:${Math.floor(timestamp / 1000)}:${type}>`;
    }

    /**
     * Generate a unix timestamp for Discord to be rendered locally per user.
     * @param options The options to use for the timestamp.
     * @return The generated timestamp.
     */
    public static generateTimestamp(options?: {
        timestamp?: Date | number;
        type?: "t" | "T" | "d" | "D" | "f" | "F" | "R";
    }): string {
        let timestamp = options?.timestamp || new Date();
        const type = options?.type || "f";
        if (timestamp instanceof Date) timestamp = timestamp.getTime();
        return `<t:${Math.floor(timestamp / 1000)}:${type}>`;
    }

    /**
     * Upload content to a hastebin server.
     * @param content The content to upload to the hastebin server.
     * @param options The options to use for the upload.
     * @returns The URL to the uploaded content.
     */
    public async uploadToHastebin(
        content: string,
        options?: { type?: string; server?: string }
    ) {
        try {
            const response = await fetch(
                `${options?.server || this.client.config.hastebin}/documents`,
                {
                    method: "POST",
                    body: content,
                    headers: {
                        "User-Agent": `${this.client.config.botName
                            .toLowerCase()
                            .split(" ")
                            .join("_")}/${this.client.config.version}`
                    }
                }
            );

            const responseJSON = await response.json();

            return `${options?.server || this.client.config.hastebin}/${
                responseJSON.key
            }.${options?.type || "md"}`;
        } catch (error) {
            this.client.logger.error(error);
            this.client.logger.sentry.captureWithExtras(error, {
                Hastebin: options?.server || this.client.config.hastebin,
                Content: content
            });

            return null;
        }
    }

    /**
     * Upload content to a hastebin server. This is a static method.
     * @param content The content to upload to the hastebin server.
     * @param options The options to use for the upload.
     * @returns The URL to the uploaded content.
     */
    public static async uploadToHastebin(
        content: string,
        options?: { type?: string; server?: string }
    ) {
        try {
            const response = await fetch(
                `${options?.server || Config.hastebin}/documents`,
                {
                    method: "POST",
                    body: content,
                    headers: {
                        "User-Agent": `${Config.botName
                            .toLowerCase()
                            .split(" ")
                            .join("_")}/${Config.version}`
                    }
                }
            );

            const responseJSON = await response.json();

            return `${options?.server || Config.hastebin}/${responseJSON.key}.${
                options?.type || "md"
            }`;
        } catch (error) {
            Logger.error(error);
            Logger.sentry.captureWithExtras(error, {
                Hastebin: options?.server || Config.hastebin,
                Content: content
            });

            return null;
        }
    }

    /**
     * Verify if the input is a function.
     * @param input The input to verify.
     * @returns Whether the input is a function or not.
     */
    public isFunction(input: any): boolean {
        return typeof input === "function";
    }

    /**
     * Verify if an object is a promise.
     * @param input The object to verify.
     * @returns Whether the object is a promise or not.
     */
    public isThenable(input: any): boolean {
        if (!input) return false;
        return (
            input instanceof Promise ||
            (input !== Promise.prototype &&
                this.isFunction(input.then) &&
                this.isFunction(input.catch))
        );
    }
}
