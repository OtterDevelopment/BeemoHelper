import { createHash } from "crypto";
import * as petitio from "petitio";
import {
    MessageActionRow,
    MessageButton,
    MessageEmbed,
    MessageEmbedOptions,
    PermissionString,
    Snowflake,
    Team,
    User
} from "discord.js";
import { existsSync, mkdirSync, readdirSync } from "fs";
import { PetitioRequest } from "petitio/dist/lib/PetitioRequest";
import { permissionNames } from "./permissions.js";
import BetterClient from "../extensions/BetterClient.js";
import { GeneratedMessage, GenerateTimestampOptions } from "../../typings";

export default class Functions {
    /**
     * Our Client.
     */
    private client: BetterClient;

    /**
     * Create our functions.
     * @param client Our client.
     */
    constructor(client: BetterClient) {
        this.client = client;
    }

    /**
     * Get all the files in all the subdirectories of a directory.
     * @param directory The directory to get the files from.
     * @param fileExtension The extension to search for.
     * @param createDirIfNotFound Whether or not the parent directory should be created if it doesn't exist.
     * @return The files in the directory.
     */
    public getFiles(
        directory: string,
        fileExtension: string,
        createDirIfNotFound: boolean = false
    ): string[] {
        if (createDirIfNotFound && !existsSync(directory)) mkdirSync(directory);
        return readdirSync(directory).filter(file =>
            file.endsWith(fileExtension)
        );
    }

    /**
     * Generate a full primary message with a simple helper function.
     * @param embedInfo The information to build our embed with.
     * @param components The components for our message.
     * @param ephemeral Whether our message should be ephemeral or not.
     * @return The generated primary message.
     */
    public generatePrimaryMessage(
        embedInfo: MessageEmbedOptions,
        components: MessageActionRow[] = [],
        ephemeral: boolean = false
    ): GeneratedMessage {
        return {
            embeds: [
                new MessageEmbed(embedInfo).setColor(
                    parseInt(this.client.config.colors.primary, 16)
                )
            ],
            components,
            ephemeral
        };
    }

    /**
     * Generate a full success message with a simple helper function.
     * @param embedInfo The information to build our embed with.
     * @param components The components for our message.
     * @param ephemeral Whether our message should be ephemeral or not.
     * @return The generated success message.
     */
    public generateSuccessMessage(
        embedInfo: MessageEmbedOptions,
        components: MessageActionRow[] = [],
        ephemeral: boolean = false
    ): GeneratedMessage {
        return {
            embeds: [
                new MessageEmbed(embedInfo).setColor(
                    parseInt(this.client.config.colors.success, 16)
                )
            ],
            components,
            ephemeral
        };
    }

    /**
     * Generate a full warning message with a simple helper function.
     * @param embedInfo The information to build our embed with.
     * @param components The components for our message.
     * @param ephemeral Whether our message should be ephemeral or not.
     * @return The generated warning message.
     */
    public generateWarningMessage(
        embedInfo: MessageEmbedOptions,
        components: MessageActionRow[] = [],
        ephemeral: boolean = false
    ): GeneratedMessage {
        return {
            embeds: [
                new MessageEmbed(embedInfo).setColor(
                    parseInt(this.client.config.colors.warning, 16)
                )
            ],
            components,
            ephemeral
        };
    }

    /**
     * Generate a full error message with a simple helper function.
     * @param embedInfo The information to build our embed with.
     * @param supportServer Whether or not to add the support server link as a component.
     * @param components The components for our message.
     * @param ephemeral Whether our message should be ephemeral or not.
     * @return The generated error message.
     */
    public generateErrorMessage(
        embedInfo: MessageEmbedOptions,
        supportServer: boolean = false,
        components: MessageActionRow[] = [],
        ephemeral: boolean = true
    ): GeneratedMessage {
        if (supportServer)
            components.concat([
                new MessageActionRow().addComponents(
                    new MessageButton({
                        label: "Support Server",
                        url: this.client.config.supportServer,
                        style: "LINK"
                    })
                )
            ]);
        return {
            embeds: [
                new MessageEmbed(embedInfo).setColor(
                    parseInt(this.client.config.colors.error, 16)
                )
            ],
            components,
            ephemeral
        };
    }

    /**
     * Upload content to the hastebin we use.
     * @param content The content to upload.
     * @param type The file type to append to the end of the haste.
     * @return The URL to the uploaded content.
     */
    public async uploadHaste(
        content: string,
        type?: string
    ): Promise<string | null> {
        try {
            const haste = await (
                (await petitio
                    // @ts-ignore
                    .default(
                        `${this.client.config.hastebin}/documents`,
                        "POST"
                    )) as PetitioRequest
            )
                .body(content)
                .header(
                    "User-Agent",
                    `${this.client.config.botName}/${this.client.config.version}`
                )
                .json();
            return `${this.client.config.hastebin}/${haste.key}${
                type ? `.${type}` : ".md"
            }`;
        } catch (error) {
            this.client.logger.error(error);
            this.client.logger.sentry.captureWithExtras(error, {
                Hastebin: this.client.config.hastebin,
                Content: content
            });
            return null;
        }
    }

    /**
     * Generate a random string of a given length.
     * @param length The length of the string to generate.
     * @param from The characters to use for the string.
     * @return The generated random ID.
     */
    public generateRandomId(
        length: number,
        from: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    ): string {
        let generatedId = "";
        for (let i = 0; i < length; i++)
            generatedId += from[Math.floor(Math.random() * from.length)];
        return generatedId;
    }

    /**
     * Get the proper name of a permission.
     * @param permission The permission to get the name of.
     * @return The proper name of the permission.
     */
    public getPermissionName(permission: PermissionString): string {
        if (permissionNames.has(permission))
            return permissionNames.get(permission)!;
        return permission;
    }

    /**
     * Generate a unix timestamp for Discord to be rendered locally per user.
     * @param options The options to use for the timestamp.
     * @return The generated timestamp.
     */
    public generateTimestamp(options?: GenerateTimestampOptions): string {
        let timestamp = options?.timestamp || new Date();
        const type = options?.type || "f";
        if (timestamp instanceof Date) timestamp = timestamp.getTime();
        return `<t:${Math.floor(timestamp / 1000)}:${type}>`;
    }

    /**
     * Parse a string to a User.
     * @param user The user to parse.
     * @return The parsed user.
     */
    public async parseUser(user?: string): Promise<User | undefined> {
        if (!user) return undefined;
        if (
            (user.startsWith("<@") || user.startsWith("<@!")) &&
            user.endsWith(">")
        )
            user = user.slice(2, -1);
        if (user.startsWith("!")) user = user.slice(1);
        try {
            return (
                this.client.users.cache.get(user) ||
                this.client.users.cache.find(
                    u => u.tag.toLowerCase() === user?.toLowerCase()
                ) ||
                (await this.client.users.fetch(user))
            );
        } catch (error: any) {
            if (error.code === 50035) return undefined;
            this.client.logger.error(error);
            this.client.logger.sentry.captureWithExtras(error, { input: user });
        }
        return undefined;
    }

    /**
     * Turn a string into Title Case.
     * @param string The string to convert.
     * @return The converted string.
     */
    public titleCase(string: string): string {
        return string
            .split(" ")
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
    }

    /**
     * Hash a string into SHA256.
     * @param string The string to hash.
     * @return The hashed string.
     */
    public hash(string: string): string {
        return createHash("sha256").update(string).digest("hex");
    }

    /**
     * Choose an item out of a list of items.
     * @param choices The list of items to choose from.
     * @return The chosen item.
     */
    public random(choices: any[]): any {
        return choices[Math.floor(Math.random() * choices.length)];
    }

    /**
     * Get whether a user is a developer or not.
     * @param snowflake The user ID to check.
     * @returns Whether the user is a developer or not.
     */
    public async isDeveloper(snowflake: Snowflake) {
        await this.client.application?.fetch();
        return (
            this.isAdmin(snowflake) &&
            ((this.client.application?.owner instanceof User &&
                this.client.application.owner.id === snowflake) ||
                (this.client.application?.owner instanceof Team &&
                    this.client.application.owner.members.has(snowflake)))
        );
    }

    /**
     * Get whether a user is an admin or not.
     * @param snowflake The user ID to check.
     * @returns Whether the user is an admin or not.
     */
    public isAdmin(snowflake: Snowflake) {
        return this.client.config.admins.includes(snowflake);
    }
}
