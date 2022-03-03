import {
    MessageEmbedOptions,
    PermissionString,
    SelectMenuInteraction
} from "discord.js";
import { ButtonOptions } from "../../typings";
import BetterClient from "../extensions/BetterClient.js";

export default class DropDown {
    /**
     * The beginning of the customId the dropdown listens for.
     */
    public readonly name: string;

    /**
     * The permissions a user would require to execute this dropdown.
     * @private
     */
    private readonly permissions: PermissionString[];

    /**
     * The permissions the client requires to execute this dropdown.
     * @private
     */
    private readonly clientPermissions: PermissionString[];

    /**
     * Whether this dropdown is only for developers.
     * @private
     */
    private readonly devOnly: boolean;

    /**
     * Whether this dropdown is only to be used in guilds.
     * @private
     */
    private readonly guildOnly: boolean;

    /**
     * Whether this button is only to be used by guild owners.
     * @private
     */
    private readonly ownerOnly: boolean;

    /**
     * Our client.
     * @private
     */
    private readonly client: BetterClient;

    /**
     * Create our dropdown.
     * @param name The beginning of the customId this dropdown listens for.
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
     * Validate this interaction to make sure this dropdown can be executed.
     * @param interaction The interaction that was created.
     * @returns The error or null if the command is valid.
     */
    public validate(interaction: SelectMenuInteraction) {
        if (this.guildOnly && !interaction.inGuild())
            return "This drop down can only be used in guilds!";
        else if (
            this.ownerOnly &&
            interaction.guild?.ownerId !== interaction.user.id
        )
            return "This drop down can only be ran by the owner of this guild!";
        else if (this.devOnly && !this.client.config.admins)
            return "This drop down can only be ran by my developer!";
        else if (
            this.permissions &&
            !interaction.memberPermissions?.has(this.permissions)
        )
            return `You need ${
                this.permissions.length > 1 ? "" : "the"
            } ${this.permissions
                .map(
                    permission =>
                        `**${this.client.functions.getPermissionName(
                            permission
                        )}**`
                )
                .join(", ")} permission${
                this.permissions.length > 1 ? "s" : ""
            } to run this drop down.`;
        else if (
            this.clientPermissions &&
            !interaction.memberPermissions?.has(this.clientPermissions)
        )
            return `You need ${
                this.permissions.length > 1 ? "" : "the"
            } ${this.permissions
                .map(
                    permission =>
                        `**${this.client.functions.getPermissionName(
                            permission
                        )}**`
                )
                .join(", ")} permission${
                this.permissions.length > 1 ? "s" : ""
            } to run this drop down.`;
        return null;
    }

    /**
     * This function must be evaluated to true or else this slash command will not be executed.
     * @param _interaction The interaction that was created.
     */
    public async preCheck(
        _interaction: SelectMenuInteraction
    ): Promise<[boolean, MessageEmbedOptions?]> {
        return [true];
    }

    /**
     * Run this dropdown.
     * @param _interaction The interaction that was created.
     */
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    public async run(_interaction: SelectMenuInteraction): Promise<any> {}
}
