import { TOptions } from "i18next";
import { LanguageValues } from "../../typings/language";
import ExtendedClient from "../extensions/ExtendedClient.js";
import * as enUS from "../../languages/en-US.json" assert { type: "json" };

type LanguageKeys = keyof typeof enUS;
export type LanguageOptions = Partial<typeof enUS>;

export default class Language {
    /** Our extended client */
    public readonly client: ExtendedClient;

    /** The ID of our language. */
    public readonly id: string;

    /** Whether or not this language is enabled. */
    public enabled: boolean;

    /** All of the key value pairs for our language. */
    public language: LanguageOptions;

    /**
     * Create our Language class.
     * @param client Our client.
     * @param id The language id.
     * @param options The options for our language.
     */
    constructor(
        client: ExtendedClient,
        id: string,
        options: { enabled: boolean; language?: LanguageOptions } = {
            enabled: true
        }
    ) {
        this.id = id;
        this.client = client;

        this.enabled = options.enabled;
        // @ts-ignore
        this.language = options.language || enUS.default;
    }

    /**
     * Initialize our language in the i18next instance.
     */
    public init() {
        this.client.i18n.addResourceBundle(
            this.id,
            this.client.config.botName.toLowerCase().split(" ").join("_"),
            this.language,
            true,
            true
        );
    }

    /**
     * Check if our language has a key.
     * @param key The key to check for.
     * @returns Whether the key exists.
     */
    public has(key: string) {
        return (
            this.client.i18n.t(key, {
                lng: this.enabled ? this.id : "en-US"
            }) !== key
        );
    }

    /**
     * Translate a key.
     * @param key The key to translate.
     * @param args The arguments for the key.
     * @returns The translated key.
     */
    public get<K extends LanguageKeys, O extends LanguageValues[K]>(
        key: K,
        args?: O & TOptions
    ) {
        if (args && !("interpolation" in args))
            args.interpolation = { escapeValue: false };

        if (!this.enabled) return this.client.i18n.t(key, { ...args });
        else if (!this.has(key))
            return `"${key} has not been localized for any languages yet."`;
        return this.client.i18n.t(key, { ...args, lng: this.id });
    }
}
