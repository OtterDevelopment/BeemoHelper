import {
    APIEmbed,
    ButtonInteraction,
    PermissionResolvable,
    PermissionsBitField
} from "discord.js";
import Language from "./Language.js";
import ExtendedClient from "../extensions/ExtendedClient.js";

export default class Button {
    /** Our extended client. */
    public readonly client: ExtendedClient;

    /** The name for this button. */
    public readonly name: string;

    /** The permissions a user requires to run this button. */
    public readonly permissions: PermissionsBitField;

    /** The permissions the clint requires to run this button. */
    public readonly clientPermissions: PermissionsBitField;

    /** Whether this button should only be able to be run by my developers. */
    public readonly devOnly: boolean;

    /** Whether this button should only be able to be run by server owners. */
    public readonly ownerOnly: boolean;

    /**
     * Create our button.
     * @param name The name for this button.
     * @param client Our extended client.
     * @param options The options for this button.
     */
    constructor(
        name: string,
        client: ExtendedClient,
        options: {
            permissions?: PermissionResolvable[];
            clientPermissions?: PermissionResolvable[];
            devOnly?: boolean;
            ownerOnly?: boolean;
        }
    ) {
        this.client = client;

        this.name = name;

        this.permissions = new PermissionsBitField(options.permissions || []);
        this.clientPermissions = new PermissionsBitField(
            client.config.requiredPermissions.concat(
                options.clientPermissions || []
            )
        );

        this.devOnly = options.devOnly || false;
        this.ownerOnly = options.ownerOnly || false;
    }

    /**
     * Validate that the interaction provided is valid.
     * @param interaction The interaction to validate.
     * @param language The language to use when replying to the interaction.
     * @returns An APIEmbed if the interaction is invalid, null if the interaction is valid.
     */
    public async validate(
        interaction: ButtonInteraction,
        language: Language
    ): Promise<APIEmbed | null> {
        if (
            this.ownerOnly &&
            interaction.guild?.ownerId !== interaction.user.id
        )
            return {
                title: language.get("MISSING_PERMISSIONS_BASE_TITLE"),
                description: language.get("MISSING_PERMISSIONS_OWNER_ONLY", {
                    type: "button"
                })
            };
        else if (
            this.devOnly &&
            !this.client.config.admins.includes(interaction.user.id)
        )
            return {
                title: language.get("MISSING_PERMISSIONS_BASE_TITLE"),
                description: language.get(
                    "MISSING_PERMISSIONS_DEVELOPER_ONLY",
                    {
                        type: "button"
                    }
                )
            };
        else if (
            interaction.inGuild() &&
            this.permissions?.toArray().length &&
            !interaction.memberPermissions.has(this.permissions)
        ) {
            const missingPermissions = this.permissions
                .toArray()
                .filter(
                    permission => !interaction.memberPermissions.has(permission)
                );

            return {
                title: language.get("MISSING_PERMISSIONS_BASE_TITLE"),
                description: language.get(
                    missingPermissions.length === 1
                        ? "MISSING_PERMISSIONS_USER_PERMISSIONS_ONE"
                        : "MISSING_PERMISSIONS_USER_PERMISSIONS_OTHER",
                    {
                        type: "button",
                        missingPermissions
                    }
                )
            };
        } else if (
            interaction.inGuild() &&
            this.clientPermissions.toArray().length &&
            interaction.guild!.members.me?.permissions.has(
                this.clientPermissions
            ) === false
        ) {
            const missingPermissions = this.clientPermissions
                .toArray()
                .filter(
                    permission =>
                        interaction.guild!.members.me?.permissions.has(
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
                        type: "button",
                        missingPermissions
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
    public async preCheck(
        _interaction: ButtonInteraction,
        _language: Language
    ): Promise<[boolean, APIEmbed?]> {
        return [true];
    }

    /**
     * Run this button.
     * @param _interaction The interaction to run this button on.
     * @param _language The language to use when replying to the interaction.
     */
    public async run(
        _interaction: ButtonInteraction,
        _language: Language
    ): Promise<any> {}
}
