import {
    APIApplicationCommandInteraction,
    APIEmbed,
    ApplicationCommandOptionType,
    ApplicationCommandType,
    Permissions,
    RESTJSONErrorCodes,
    RESTPostAPIApplicationCommandsJSONBody
} from "@discordjs/core";
import { DiscordAPIError } from "@discordjs/rest";
import Language from "./Language.js";
import ExtendedClient from "../extensions/ExtendedClient.js";
import PermissionsBitField from "../utilities/permissions.js";

export default class ApplicationCommand {
    /** Our extended client. */
    public readonly client: ExtendedClient;

    /** The name for this application command. */
    public readonly name: string;

    /** The type of application command. */
    public readonly type: ApplicationCommandType;

    /** The options for this application command. */
    public readonly options: RESTPostAPIApplicationCommandsJSONBody;

    /** The permissions the user requires to run this application command. */
    private readonly permissions?: Permissions;

    /** The permissions the client requires to run this application command. */
    private readonly clientPermissions: Permissions;

    /** Whether or not this application command can only be used by developers. */
    private readonly devOnly: boolean;

    /** Whether or not this application command can only be run by the guild owner. */
    private readonly ownerOnly: boolean;

    /** The cooldown on this application command. */
    public readonly cooldown: number;

    /** The guilds this application command should be loaded into, if this value is defined, this command will only be added to these guilds and not globally. */
    public readonly guilds: string[];

    /**
     * Create a new application command.
     * @param client Our extended client.
     * @param options The options for this application command.
     */
    constructor(
        client: ExtendedClient,
        options: {
            options: RESTPostAPIApplicationCommandsJSONBody;
            permissions?: Permissions;
            clientPermissions?: Permissions;
            devOnly?: boolean;
            ownerOnly?: boolean;
            cooldown?: number;
            guilds?: string[];
        }
    ) {
        this.client = client;

        this.type = options.options.type!;
        this.options = options.options;
        this.name = options.options.name;

        this.permissions = options.options
            .default_member_permissions as Permissions;
        this.clientPermissions = options.clientPermissions as Permissions;

        this.devOnly = options.devOnly || false;
        this.ownerOnly = options.ownerOnly || false;

        this.cooldown = options.cooldown || 0;

        this.guilds = options.guilds || [];
    }

    /**
     * Apply a cooldown to a user.
     * @param userId The userID to apply the cooldown on.
     * @param cooldown The cooldown to apply, if not provided the default cooldown for this application command will be used.
     * @returns True or False if the cooldown was applied.
     */
    public async applyCooldown(userId: string, cooldown?: number) {
        if (this.cooldown) {
            const expiresAt = new Date(
                Date.now() + (cooldown || this.cooldown)
            );

            return this.client.prisma.cooldown
                .upsert({
                    where: {
                        commandName_commandType_userId: {
                            commandName: this.name,
                            commandType: "APPLICATION_COMMAND",
                            userId
                        }
                    },
                    update: {
                        expiresAt
                    },
                    create: {
                        commandName: this.name,
                        commandType: "APPLICATION_COMMAND",
                        expiresAt,
                        userId
                    }
                })
                .then(Boolean);
        }

        return false;
    }

    /**
     * Validate that the interaction provided is valid.
     * @param interaction The interaction to validate.
     * @param language The language to use when replying to the interaction.
     * @returns An APIEmbed if the interaction is invalid, null if the interaction is valid.
     */
    public async validate({
        interaction,
        language
    }: {
        interaction: APIApplicationCommandInteraction;
        shardId: number;
        language: Language;
    }): Promise<APIEmbed | null> {
        const type =
            this.type === ApplicationCommandType.ChatInput
                ? "slash command"
                : "context menu";

        if (this.ownerOnly && interaction.guild_id) {
            if (!this.client.guildOwnersCache.has(interaction.guild_id)) {
                try {
                    const guild = await this.client.api.guilds.get(
                        interaction.guild_id
                    );

                    this.client.guildOwnersCache.set(
                        interaction.guild_id,
                        guild.owner_id
                    );
                } catch (error) {
                    if (
                        error instanceof DiscordAPIError &&
                        error.code === RESTJSONErrorCodes.UnknownUser
                    ) {
                        const eventId =
                            await this.client.logger.sentry.captureWithInteraction(
                                error,
                                interaction
                            );

                        return {
                            title: language.get("INTERNAL_ERROR_TITLE"),
                            description: language.get(
                                "INTERNAL_ERROR_DESCRIPTION"
                            ),
                            footer: {
                                text: language.get("SENTRY_EVENT_ID_FOOTER", {
                                    eventId
                                })
                            }
                        };
                    }

                    await this.client.logger.sentry.captureWithInteraction(
                        error,
                        interaction
                    );
                    throw error;
                }
            }

            const guildOwnerId = this.client.guildOwnersCache.get(
                interaction.guild_id
            );

            if (
                guildOwnerId !==
                (interaction.member?.user ?? interaction.user!).id
            )
                return {
                    title: language.get("MISSING_PERMISSIONS_BASE_TITLE"),
                    description: language.get(
                        "MISSING_PERMISSIONS_OWNER_ONLY_DESCRIPTION",
                        {
                            type
                        }
                    )
                };
        } else if (
            this.devOnly &&
            !this.client.config.admins.includes(
                (interaction.member?.user ?? interaction.user!).id || ""
            )
        )
            return {
                title: language.get("MISSING_PERMISSIONS_BASE_TITLE"),
                description: language.get(
                    "MISSING_PERMISSIONS_DEVELOPER_ONLY_DESCRIPTION",
                    {
                        type
                    }
                )
            };
        else if (
            interaction.guild_id &&
            this.permissions &&
            !PermissionsBitField.has(
                BigInt(interaction.member?.permissions ?? 0),
                BigInt(this.permissions)
            )
        ) {
            const missingPermissions = PermissionsBitField.toArray(
                PermissionsBitField.difference(
                    BigInt(this.permissions),
                    BigInt(interaction.member?.permissions ?? 0)
                )
            )
                .map(permission => `**${language.get(permission)}**`)
                .join(", ");

            return {
                title: language.get("MISSING_PERMISSIONS_BASE_TITLE"),
                description: language.get(
                    missingPermissions.length === 1
                        ? "MISSING_PERMISSIONS_USER_PERMISSIONS_ONE_DESCRIPTION"
                        : "MISSING_PERMISSIONS_USER_PERMISSIONS_OTHER_DESCRIPTION",
                    {
                        type,
                        missingPermissions
                    }
                )
            };
        } else if (
            interaction.guild_id &&
            this.clientPermissions &&
            !PermissionsBitField.has(
                BigInt(interaction.app_permissions ?? 0),
                BigInt(this.clientPermissions)
            )
        ) {
            const missingPermissions = PermissionsBitField.toArray(
                PermissionsBitField.difference(
                    BigInt(this.clientPermissions),
                    BigInt(interaction.app_permissions ?? 0)
                )
            )
                .map(permission => `**${language.get(permission)}**`)
                .join(", ");

            return {
                title: language.get("MISSING_PERMISSIONS_BASE_TITLE"),
                description: language.get(
                    missingPermissions.length === 1
                        ? "MISSING_PERMISSIONS_CLIENT_PERMISSIONS_ONE_DESCRIPTION"
                        : "MISSING_PERMISSIONS_CLIENT_PERMISSIONS_OTHER_DESCRIPTION",
                    {
                        type,
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
                        userId: (interaction.member?.user ?? interaction.user!)
                            .id
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
                                type,
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
     * Pre-check the provided interaction after validating it.
     * @param _interaction The interaction to pre-check.
     * @param _language The language to use when replying to the interaction.
     * @returns A tuple containing a boolean and an APIEmbed if the interaction is invalid, a boolean if the interaction is valid.
     */
    public async preCheck({
        interaction: _interaction,
        language: _language
    }: {
        interaction: APIApplicationCommandInteraction;
        shardId: number;
        language: Language;
    }): Promise<[boolean, APIEmbed?]> {
        return [true];
    }

    /**
     * Run this application command.
     * @param _interaction The interaction to run this command on.
     * @param _language The language to use when replying to the interaction.
     */
    public async run({
        interaction: _interaction,
        language: _language
    }: {
        interaction: APIApplicationCommandInteraction;
        shardId: number;
        language: Language;
    }): Promise<any> {}
}
