import i18next from "i18next";
import { resolve } from "path";
import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";
import intervalPlural from "i18next-intervalplural-postprocessor";
import { Client, ClientOptions, Collection, TextChannel } from "discord.js";
import Logger from "../classes/Logger.js";
import Button from "../classes/Button.js";
import Server from "../classes/Server.js";
import Metrics from "../classes/Metrics.js";
import Config from "../../config/bot.config.js";
import Functions from "../utilities/functions.js";
import TextCommand from "../classes/TextCommand.js";
import EventHandler from "../classes/EventHandler.js";
import AutoComplete from "../classes/AutoComplete.js";
import ButtonHandler from "../classes/ButtonHandler.js";
import LanguageHandler from "../classes/LanguageHandler.js";
import ApplicationCommand from "../classes/ApplicationCommand.js";
import TextCommandHandler from "../classes/TextCommandHandler.js";
import AutoCompleteHandler from "../classes/AutoCompleteHandler.js";
import ApplicationCommandHandler from "../classes/ApplicationCommandHandler.js";

export default class ExtendedClient extends Client {
    /** The configuration for our bot. */
    public readonly config: typeof Config;

    /** The logger for our bot. */
    public readonly logger: typeof Logger;

    /** The functions for our bot. */
    public readonly functions: Functions;

    /** Our Prisma client, this is an ORM. */
    public readonly prisma: PrismaClient<{
        errorFormat: "pretty";
        log: (
            | {
                  emit: "stdout";
                  level: "warn";
              }
            | {
                  emit: "stdout";
                  level: "error";
              }
            | {
                  emit: "event";
                  level: "query";
              }
        )[];
    }>;

    /** The i18n instance for our bot. */
    public readonly i18n: typeof i18next;

    /** Our Fastify server. */
    public server: Server;

    /** Our Metrics system. */
    public readonly metrics: Metrics;

    /** __dirname is not in our version of ECMA, this is a workaround. */
    public readonly __dirname: string;

    /** A set of users that are currently using the bot, whether this be through a slash command, button, etc. */
    public usersUsingBot: Set<string>;

    /** The global log channel for our bot, this will start off as undefined and then eventually be replaced. */
    public helperGlobalChannel: TextChannel | null;

    /** The language handler for our bot. */
    public readonly languageHandler: LanguageHandler;

    public events: Map<string, EventHandler>;

    /** A collection of application commands the bot has registered. */
    public applicationCommands: Collection<string, ApplicationCommand>;

    /** The application command handler for our extended client. */
    public readonly applicationCommandHandler: ApplicationCommandHandler;

    /** A collection of text commands the bot has registered. */
    public textCommands: Collection<string, TextCommand>;

    /** The text command handler for our extended client. */
    public readonly textCommandHandler: TextCommandHandler;

    /** A collection of auto completes the bot has registered. */
    public autoCompletes: Collection<string[], AutoComplete>;

    /** The auto complete handler for our extended client/ */
    public autoCompleteHandler: AutoCompleteHandler;

    /** A collection of buttons the bot has registered. */
    public buttons: Collection<string, Button>;

    /** The button handler for our extended client/ */
    public buttonHandler: ButtonHandler;

    public cachedStats = {
        guilds: 0,
        users: 0
    };

    /**
     * Create our extended client.
     * @param options The options for the client.
     */
    constructor(options: ClientOptions) {
        super(options);

        this.config = Config;
        this.config.version = execSync("git rev-parse HEAD")
            .toString()
            .trim()
            .slice(0, 7);

        this.logger = Logger;
        this.functions = new Functions(this);

        this.prisma = new PrismaClient({
            errorFormat: "pretty",
            log: [
                { emit: "stdout", level: "warn" },
                { emit: "stdout", level: "error" },
                { emit: "event", level: "query" }
            ]
        });

        if (process.env.NODE_ENV === "development") {
            this.prisma.$on("query", event => {
                try {
                    const paramsArray = JSON.parse(event.params) as unknown[];
                    const newQuery = event.query.replace(
                        /\$(\d+)/g,
                        (_, number) => {
                            const value = paramsArray[Number(number) - 1];

                            if (typeof value === "string") {
                                return `"${value}"`;
                            }

                            if (Array.isArray(value)) {
                                return `'${JSON.stringify(value)}'`;
                            }

                            return String(value);
                        }
                    );

                    this.logger.debug("prisma:query", newQuery);
                } catch {
                    this.logger.debug(
                        "prisma:query",
                        event.query,
                        "PARAMETERS",
                        event.params
                    );
                }
            });

            this.prisma.$use(async (params, next) => {
                const before = Date.now();

                const result = await next(params);

                const after = Date.now();

                this.logger.debug(
                    "prisma:query",
                    `${params.model}.${params.action} took ${String(
                        after - before
                    )}ms`
                );

                return result;
            });
        }

        this.i18n = i18next;
        this.i18n.use(intervalPlural).init({
            fallbackLng: "en-US",
            resources: {},
            fallbackNS: this.config.botName.toLowerCase().split(" ").join("_"),
            lng: "en-US"
        });

        this.server = new Server(this, parseInt(process.env.FASTIFY_PORT, 10));

        this.metrics = new Metrics(this);

        this.__dirname = resolve();

        this.usersUsingBot = new Set();
        this.helperGlobalChannel = null;

        this.languageHandler = new LanguageHandler(this);
        this.languageHandler.loadLanguages();

        this.events = new Map();
        this.loadEvents();

        this.applicationCommands = new Collection();
        this.applicationCommandHandler = new ApplicationCommandHandler(this);
        this.applicationCommandHandler.loadApplicationCommands();

        this.textCommands = new Collection();
        this.textCommandHandler = new TextCommandHandler(this);
        this.textCommandHandler.loadTextCommands();

        this.autoCompletes = new Collection();
        this.autoCompleteHandler = new AutoCompleteHandler(this);
        this.autoCompleteHandler.loadAutoCompletes();

        this.buttons = new Collection();
        this.buttonHandler = new ButtonHandler(this);
        this.buttonHandler.loadButtons();
    }

    /**
     * Load all the events in the events directory.
     */
    private loadEvents() {
        return this.functions
            .getFiles(`${this.__dirname}/dist/src/bot/events`, ".js", true)
            .forEach(async eventFileName => {
                const EventFile = await import(
                    `../../src/bot/events/${eventFileName}`
                );

                // @ts-ignore
                const event = new EventFile.default(
                    this,
                    eventFileName.split(".js")[0]
                ) as EventHandler;

                event.listen();

                return this.events.set(event.name, event);
            });
    }

    /**
     * Reload all the events in the events directory.
     */
    public reloadEvents() {
        this.events.forEach(event => event.removeListener());
        this.events.clear();

        return this.loadEvents();
    }

    /**
     * Fetch all the stats for our client.
     */
    public async fetchStats() {
        if (this.isReady() === false) return this.cachedStats;

        const stats = await this.shard?.broadcastEval(client => {
            return {
                guilds: client.guilds.cache.size,
                users: client.guilds.cache.reduce(
                    (previous, guild) => previous + (guild.memberCount ?? 0),
                    0
                )
            };
        });

        const reducedStats = stats?.reduce((previous, current) => {
            Object.keys(current).forEach(
                // @ts-ignore
                key => (previous[key] += current[key])
            );
            return previous;
        });
        this.cachedStats = reducedStats || this.cachedStats;
        return reducedStats || this.cachedStats;
    }
}
