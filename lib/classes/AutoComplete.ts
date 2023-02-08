import { AutocompleteInteraction } from "discord.js";
import ExtendedClient from "../extensions/ExtendedClient";
import Language from "./Language";

export default class AutoComplete {
    /** A list of strings that this autocomplete should listen to. */
    public readonly accepts: string[];

    /** Our extended client. */
    public readonly client: ExtendedClient;

    /**
     * Create a new application command.
     * @param accepts A list of strings that this autocomplete should listen to.
     * @param client Our extended client.
     */
    constructor(accepts: string[], client: ExtendedClient) {
        this.accepts = accepts;
        this.client = client;
    }

    /**
     * Run this auto complete.
     * @param _interaction The interaction to run this auto complete for.
     * @param _language The language to use when replying to the interaction.
     */
    public async run(
        _interaction: AutocompleteInteraction,
        _language: Language
    ): Promise<any> {}
}

