import { resolve } from "path";
import { MongoClient } from "mongodb";
import * as metrics from "datadog-metrics";
import { Client, ClientOptions, Collection, Snowflake } from "discord.js";
import Button from "../classes/Button.js";
import DropDown from "../classes/DropDown.js";
import * as Logger from "../classes/Logger.js";
import Config from "../../config/bot.config.js";
import Functions from "../utilities/functions.js";
import { CachedStats, Stats } from "../../typings";
import TextCommand from "../classes/TextCommand.js";
import EventHandler from "../classes/EventHandler.js";
import SlashCommand from "../classes/SlashCommand.js";
import ButtonHandler from "../classes/ButtonHandler.js";
import DropDownHandler from "../classes/DropDownHandler.js";
import TextCommandHandler from "../classes/TextCommandHandler.js";
import SlashCommandHandler from "../classes/SlashCommandHandler.js";
import AutoCompleteHandler from "../classes/AutoCompleteHandler.js";
import AutoComplete from "../classes/AutoComplete.js";

export default class BetterClient extends Client {
    /**
     * A set of users that are currently using the bot.
     */
    public usersUsingBot: Set<string>;

    /**
     * The config for our client.
     */
    public readonly config;

    /**
     * The functions for our client.
     */
    public readonly functions: Functions;

    /**
     * The logger for our client.
     */
    public readonly logger: Logger.Logger;

    /**
     * The slashCommandHandler for our client.
     */
    public readonly slashCommandHandler: SlashCommandHandler;

    /**
     * The slashCommands for our client.
     */
    public slashCommands: Collection<string, SlashCommand>;

    /**
     * The textCommandHandler for our client.
     */
    public readonly textCommandHandler: TextCommandHandler;

    /**
     * The textCommands for our client.
     */
    public textCommands: Collection<string, TextCommand>;

    /**
     * The buttonHandler for our client.
     */
    public readonly buttonHandler: ButtonHandler;

    /**
     * The buttons for our client.
     */
    public buttons: Collection<string, Button>;

    /**
     * The dropDownHandler for our client.
     */
    public readonly dropDownHandler: DropDownHandler;

    /**
     * The dropDowns for our client.
     */
    public dropDowns: Collection<string, DropDown>;

    /**
     * The autoCompleteHandler for our client.
     */
    public readonly autoCompleteHandler: AutoCompleteHandler;

    /**
     * The autoCompletes for our client.
     */
    public autoCompletes: Collection<string, AutoComplete>;

    /**
     * The events for our client.
     */
    public events: Map<string, EventHandler>;

    /**
     * Our MongoDB database.
     */
    public readonly mongo: MongoClient;

    /**
     * Our data dog client.
     */
    public readonly dataDog: typeof metrics;

    /**
     * The current version of our client.
     */
    public readonly version: string;

    /**
     * Our client's stats.
     */
    public stats: Stats;

    /**
     * Our client's cached stats.
     */
    public cachedStats: CachedStats;

    /**
     * __dirname is not in our version of ECMA, so we make do with a shitty fix.
     */
    public readonly __dirname: string;

    /**
     * All currently active raids on guilds.
     */
    public activeRaids: Collection<Snowflake, Snowflake[]>;

    /**
     * Create our client.
     * @param options The options for our client.
     */
    constructor(options: ClientOptions) {
        super(options);

        this.__dirname = resolve();

        this.usersUsingBot = new Set();
        this.config = Config;
        this.functions = new Functions(this);
        this.logger = Logger.default;

        this.slashCommandHandler = new SlashCommandHandler(this);
        this.slashCommands = new Collection();

        this.textCommandHandler = new TextCommandHandler(this);
        this.textCommands = new Collection();

        this.buttonHandler = new ButtonHandler(this);
        this.buttons = new Collection();

        this.dropDownHandler = new DropDownHandler(this);
        this.dropDowns = new Collection();

        this.autoCompleteHandler = new AutoCompleteHandler(this);
        this.autoCompletes = new Collection();

        this.events = new Map();

        this.mongo = new MongoClient(process.env.MONGO_URI);

        this.version =
            process.env.NODE_ENV === "development"
                ? `${this.config.version}-dev`
                : this.config.version;

        this.stats = {
            messageCount: 0,
            commandsRun: 0
        };

        this.cachedStats = {
            guilds: 0,
            users: 0,
            cachedUsers: 0,
            channels: 0,
            roles: 0
        };

        this.activeRaids = new Collection();

        this.dropDownHandler.loadDropDowns();
        this.buttonHandler.loadButtons();
        this.slashCommandHandler.loadSlashCommands();
        this.textCommandHandler.loadTextCommands();
        this.autoCompleteHandler.loadAutoCompletes();
        this.loadEvents();

        // @ts-ignore
        this.dataDog = metrics.default;
        if (this.config.dataDog.apiKey?.length) {
            this.dataDog.init({
                flushIntervalSeconds: 0,
                apiKey: this.config.dataDog.apiKey,
                prefix: `${this.config.botName}.`,
                defaultTags: [`env:${process.env.NODE_ENV}`]
            });
            setInterval(() => {
                this.dataDog.gauge("guilds", this.cachedStats.guilds);
                this.dataDog.gauge("users", this.cachedStats.users);
                if (this.isReady())
                    this.dataDog.flush(
                        () =>
                            this.logger.info(`Flushed information to DataDog.`),
                        error => {
                            this.logger.error(error);
                            if (!error.message.includes("EAI_AGAIN"))
                                this.logger.sentry.captureException(error);
                        }
                    );
            }, 60000);
        }
    }

    /**
     * Connect to MongoDB and login to Discord.
     */
    override async login() {
        await this.mongo.connect();
        return super.login();
    }

    /**
     * Load all the events in the events directory.
     */
    private loadEvents() {
        return this.functions
            .getFiles(`${this.__dirname}/dist/src/bot/events`, ".js", true)
            .forEach(async eventFileName => {
                const eventFile = await import(
                    `./../../src/bot/events/${eventFileName}`
                );
                // eslint-disable-next-line new-cap
                const event: EventHandler = new eventFile.default(
                    this,
                    eventFileName.split(".js")[0]
                );
                event.listen();
                return this.events.set(event.name, event);
            });
    }

    /**
     * Reload all the events in the events directory.
     */
    public reloadEvents() {
        this.events.forEach(event => event.removeListener());
        this.loadEvents();
    }

    /**
     * Fetch all the stats for our client.
     */
    public async fetchStats() {
        const stats = await this.shard?.broadcastEval(client => {
            return {
                guilds: client.guilds.cache.size,
                users: client.guilds.cache.reduce(
                    (previous, guild) => previous + (guild.memberCount ?? 0),
                    0
                ),
                cachedUsers: client.users.cache.size,
                channels: client.channels.cache.size,
                roles: client.guilds.cache.reduce(
                    (previous, guild) => previous + guild.roles.cache.size,
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
