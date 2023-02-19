import {
    APIEmbed,
    Message,
    PermissionResolvable,
    PermissionsBitField
} from "discord.js";
import Language from "./Language.js";
import ExtendedClient from "../extensions/ExtendedClient.js";

export default class TextCommand {
    /** Our extended client. */
    public readonly client: ExtendedClient;

    /** The name for this application command. */
    public readonly name: string;

    /** The permissions the user requires to run this application command. */
    public readonly permissions: PermissionsBitField;

    /** The permissions the client requires to run this application command. */
    public readonly clientPermissions: PermissionsBitField;

    /** Whether or not this application command can only be used by developers. */
    public readonly devOnly: boolean;

    /** Whether or not this application command can only be run by the guild owner. */
    public readonly ownerOnly: boolean;

    /** The cooldown on this application command. */
    public readonly cooldown: number;

    /**
     * Create a new text command.
     * @param client Our extended client.
     * @param options The options for this text command.
     */
    constructor(
        client: ExtendedClient,
        options: {
            name: string;
            description?: string;
            permissions?: PermissionResolvable[];
            clientPermissions?: PermissionResolvable[];
            devOnly?: boolean;
            ownerOnly?: boolean;
            cooldown?: number;
        }
    ) {
        this.client = client;

        this.name = options.name;

        this.permissions = new PermissionsBitField(options.permissions || []);
        this.clientPermissions = new PermissionsBitField(
            client.config.requiredPermissions.concat(
                options.clientPermissions || []
            )
        );

        this.devOnly = options.devOnly || false;
        this.ownerOnly = options.ownerOnly || false;

        this.cooldown = options.cooldown || 0;
    }

    /**
     * Apply a cooldown to a user.
     * @param userId The userID to apply the cooldown on.
     * @param cooldown The cooldown to apply, if not provided the default cooldown for this text command will be used.
     * @returns True or False if the cooldown was applied.
     */
    public async applyCooldown(userId: string, cooldown?: number) {
        if (this.cooldown) {
            const expiresAt = new Date(
                Date.now() + (cooldown || this.cooldown)
            );

            return this.client.prisma.cooldown.upsert({
                where: {
                    commandName_commandType_userId: {
                        commandName: this.name,
                        commandType: "TEXT_COMMAND",
                        userId
                    }
                },
                update: {
                    expiresAt
                },
                create: {
                    commandName: this.name,
                    commandType: "TEXT_COMMAND",
                    expiresAt,
                    userId
                }
            });
        }

        return false;
    }

    /**
     * Validate that the message provided is valid.
     * @param message The message to validate.
     * @param language The language to use when replying to the message.
     * @returns An APIEmbed if the message is invalid, null if the message is valid.
     */
    public async validate(
        message: Message,
        language: Language
    ): Promise<APIEmbed | null> {
        if (this.ownerOnly && message.guild?.ownerId !== message.author.id)
            return {
                title: language.get("MISSING_PERMISSIONS_BASE_TITLE"),
                description: language.get("MISSING_PERMISSIONS_OWNER_ONLY", {
                    type: "text command"
                })
            };
        else if (
            this.devOnly &&
            !this.client.config.admins.includes(message.author.id)
        )
            return {
                title: language.get("MISSING_PERMISSIONS_BASE_TITLE"),
                description: language.get(
                    "MISSING_PERMISSIONS_DEVELOPER_ONLY",
                    {
                        type: "text command"
                    }
                )
            };
        else if (
            message.inGuild() &&
            this.permissions?.toArray().length &&
            !message.member?.permissions.has(this.permissions)
        ) {
            const missingPermissions = this.permissions
                .toArray()
                .filter(
                    permission => !message.member?.permissions.has(permission)
                );

            return {
                title: language.get("MISSING_PERMISSIONS_BASE_TITLE"),
                description: language.get(
                    missingPermissions.length === 1
                        ? "MISSING_PERMISSIONS_USER_PERMISSIONS_ONE"
                        : "MISSING_PERMISSIONS_USER_PERMISSIONS_OTHER",
                    {
                        type: "text command",
                        missingPermissions
                    }
                )
            };
        } else if (
            message.inGuild() &&
            this.clientPermissions.toArray().length &&
            message.guild.members.me?.permissions.has(
                this.clientPermissions
            ) === false
        ) {
            const missingPermissions = this.clientPermissions
                .toArray()
                .filter(
                    permission =>
                        message.guild.members.me?.permissions.has(
                            permission
                        ) === false
                );

            return {
                title: language.get("MISSING_PERMISSIONS_BASE_TITLE"),
                description: language.get(
                    missingPermissions.length === 1
                        ? "MISSING_PERMISSIONS_CLIENT_PERMISSIONS_ONE"
                        : "MISSING_PERMISSIONS_CLIENT_PERMISSIONS_OTHER",
                    {
                        type: "text command",
                        missingPermissions
                    }
                )
            };
        } else if (this.cooldown) {
            const cooldownItem = await this.client.prisma.cooldown.findUnique({
                where: {
                    commandName_commandType_userId: {
                        commandName: this.name,
                        commandType: "APPLICATION_COMMAND",
                        userId: message.author.id
                    }
                }
            });

            if (cooldownItem)
                if (Date.now() > cooldownItem.expiresAt.valueOf())
                    return {
                        title: language.get("TYPE_ON_COOLDOWN_TITLE"),
                        description: language.get(
                            "TYPE_ON_COOLDOWN_DESCRIPTION",
                            {
                                type: "text command",
                                formattedTime: this.client.functions.format(
                                    cooldownItem.expiresAt.valueOf() -
                                        Date.now(),
                                    true,
                                    language
                                )
                            }
                        )
                    };
        }

        return null;
    }

    /**
     * Pre-check the provided message after validating it.
     * @param _message The message to pre-check.
     * @param language The language to use when replying to the message.
     * @returns A tuple containing a boolean and an APIEmbed if the message is invalid, a boolean if the message is valid.
     */
    public async preCheck(
        _message: Message,
        _language: Language
    ): Promise<[boolean, APIEmbed?]> {
        return [true];
    }

    /**
     * Run this text command.
     * @param _message The message to run this command on.
     * @param _language The language to use when replying to the message.
     * @param _args The arguments to use when running this command.
     */
    public async run(
        _message: Message,
        _language: Language,
        _args: string[]
    ): Promise<any> {}
}
