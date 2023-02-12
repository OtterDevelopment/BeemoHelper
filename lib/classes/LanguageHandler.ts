import Language, { LanguageOptions } from "./Language.js";
import ExtendedClient from "../extensions/ExtendedClient.js";

export default class LanguageHandler {
    /** Our extended client */
    public readonly client: ExtendedClient;

    /** A set containing all of our languages. */
    public languages = new Set<Language>();

    /** The default language to resort to. */
    public defaultLanguage: Language | null;

    /**
     * Create our LanguageHandler class.
     * @param client Our client.
     */
    constructor(client: ExtendedClient) {
        this.client = client;

        this.defaultLanguage = null;
    }

    /**
     * Load all of our languages into our array.
     */
    public loadLanguages() {
        this.client.functions
            .getFiles(`${this.client.__dirname}/dist/languages/`, ".json")
            .forEach(async fileName => {
                const languageFile: LanguageOptions = await import(
                    `../../languages/${fileName}`,
                    { assert: { type: "json" } }
                ).then(file => file.default);

                const language: Language = new Language(
                    this.client,
                    languageFile.LANGUAGE_ID!,
                    {
                        enabled: languageFile.LANGUAGE_ENABLED!,
                        language: languageFile
                    }
                );

                this.languages.add(language);
                language.init();
            });

        this.defaultLanguage = this.enabledLanguages.find(
            language => language.id === "en-US"
        )!;
    }

    /**
     * Get all enabled languages.
     */
    get enabledLanguages() {
        return [...this.languages].filter(language => language.enabled);
    }

    /**
     * Get a language with a given ID.
     * @param languageId The language id to get.
     * @returns The language with the given id.
     */
    public getLanguage(languageId?: string) {
        if (!this.defaultLanguage)
            this.defaultLanguage = this.enabledLanguages.find(
                language => language.id === "en-US"
            )!;

        return (
            this.enabledLanguages.find(
                language => language.id === languageId
            ) || this.defaultLanguage
        );
    }
}
