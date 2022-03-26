import {
    ButtonInteraction,
    MessageEmbedOptions,
    PermissionString
} from "discord.js";
import { ButtonOptions } from "../../typings";
import BetterClient from "../extensions/BetterClient.js";

export default class Button {
    /**
     * The beginning of the customId this button listens for.
     */
    public readonly name: string;

    /**
     * The permissions a user would require to execute this button.
     */
    private readonly permissions: PermissionString[];

    /**
     * The permissions the client requires to execute this button.
     */
    private readonly clientPermissions: PermissionString[];

    /**
     * Whether this button is only for developers.
     */
    private readonly devOnly: boolean;

    /**
     * Whether this button is only to be used in guilds.
     */
    private readonly guildOnly: boolean;

    /**
     * Whether this button is only to be used by guild owners.
     */
    private readonly ownerOnly: boolean;

    /**
     * Our client.
     */
    public readonly client: BetterClient;

    /**
     * Create our Button.
     * @param name The beginning of the customId this button listens for.
     * @param client Our client.
     * @param options The options for our button.
     */
    constructor(name: string, client: BetterClient, options: ButtonOptions) {
        this.name = name;

        this.permissions = options.permissions || [];
        this.clientPermissions = client.config.requiredPermissions.concat(
            options.clientPermissions || []
        );

        this.devOnly = options.devOnly || false;
        this.guildOnly = options.guildOnly || false;
        this.ownerOnly = options.ownerOnly || false;

        this.client = client;
    }

    /**
     * Validate this interaction to make sure this button can be executed.
     * @param interaction The interaction that was created.
     * @returns The error or null if the command is valid.
     */
    public validate(
        interaction: ButtonInteraction
    ): MessageEmbedOptions | null {
        if (this.guildOnly && !interaction.inGuild())
            return {
                title: "Missing Permissions",
                description: "This button can only be used in guilds!"
            };
        else if (
            this.ownerOnly &&
            interaction.guild?.ownerId !== interaction.user.id
        )
            return {
                title: "Missing Permissions",
                description:
                    "This button can only be ran by the owner of this guild!"
            };
        else if (
            this.devOnly &&
            !this.client.functions.isDeveloper(interaction.user.id)
        )
            return {
                title: "Missing Permissions",
                description: "This button can only be used by my developers!"
            };
        else if (
            interaction.guild &&
            this.permissions.length &&
            !interaction.memberPermissions?.has(this.permissions)
        )
            return {
                title: "Missing Permissions",
                description: `You need the ${this.permissions
                    .map(
                        permission =>
                            `**${this.client.functions.getPermissionName(
                                permission
                            )}**`
                    )
                    .join(", ")} permission${
                    this.permissions.length > 1 ? "s" : ""
                } to run this button.`
            };
        else if (
            interaction.guild &&
            this.clientPermissions.length &&
            !interaction.guild?.me?.permissions.has(this.clientPermissions)
        )
            return {
                title: "Missing Permissions",
                description: `I need the ${this.clientPermissions
                    .map(
                        permission =>
                            `**${this.client.functions.getPermissionName(
                                permission
                            )}**`
                    )
                    .join(", ")} permission${
                    this.clientPermissions.length > 1 ? "s" : ""
                } to run this button.`
            };
        return null;
    }

    /**
     * This function must be evaluated to true or else this slash command will not be executed.
     * @param _interaction The interaction that was created.
     */
    public async preCheck(
        _interaction: ButtonInteraction
    ): Promise<[boolean, MessageEmbedOptions?]> {
        return [true];
    }

    /**
     * Run this button.
     * @param _interaction The interaction that was created.
     */
    public async run(_interaction: ButtonInteraction): Promise<void> {}
}
