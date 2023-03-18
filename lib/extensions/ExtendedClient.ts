import i18next from "i18next";
import { resolve } from "path";
import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";
import intervalPlural from "i18next-intervalplural-postprocessor";
import {
    API,
    APIGuild,
    Client,
    ClientOptions,
    MappedEvents
} from "@discordjs/core";
import { Gauge } from "prom-client";
import Logger from "../classes/Logger.js";
import metrics from "../classes/Metrics.js";
import Config from "../../config/bot.config.js";
import Functions from "../utilities/functions.js";
import EventHandler from "../classes/EventHandler.js";
import LanguageHandler from "../classes/LanguageHandler.js";
import ApplicationCommand from "../classes/ApplicationCommand.js";
import ApplicationCommandHandler from "../classes/ApplicationCommandHandler.js";

export default class ExtendedClient extends Client {
    /** An API instance to make using Discord's API much easier. */
    public readonly api: API;

    /** The configuration for our bot. */
    public readonly config: typeof Config;

    /** The logger for our bot. */
    public readonly logger: typeof Logger;

    /** The functions for our bot. */
    public readonly functions: Functions;

    /** The i18n instance for our bot. */
    public readonly i18n: typeof i18next;

    /** __dirname is not in our version of ECMA, this is a workaround. */
    public readonly __dirname: string;

    /** Our Prisma client, this is an ORM to interact with our PostgreSQL instance. */
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

    /** All of the different gauges we use for Metrics with Prometheus and Grafana. */
    private gauges: Map<keyof typeof metrics, Gauge>;

    /** A map of guild ID to user ID, representing a guild and who owns it. */
    public guildOwnersCache: Map<string, string>;

    /** The language handler for our bot. */
    public readonly languageHandler: LanguageHandler;

    /** A map of events that our client is listening to. */
    public events: Map<keyof MappedEvents, EventHandler>;

    /** A map of the application commands that the bot is currently handling. */
    public applicationCommands: Map<string, ApplicationCommand>;

    /** The application command handler for our bot. */
    public readonly applicationCommandHandler: ApplicationCommandHandler;

    constructor({ rest, ws }: ClientOptions) {
        super({ rest, ws });

        this.api = new API(rest);

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
                {
                    level: "warn",
                    emit: "stdout"
                },
                {
                    level: "error",
                    emit: "stdout"
                },
                { level: "query", emit: "event" }
            ]
        });

        this.gauges = new Map<keyof typeof metrics, Gauge>();

        Object.entries(metrics).forEach(([key, gauge]) => {
            this.gauges.set(
                key as keyof typeof metrics,
                new Gauge({
                    name: key,
                    ...gauge
                })
            );
        });

        this.guildOwnersCache = new Map();

        // I forget what this is even used for, but Vlad from https://github.com/vladfrangu/highlight uses it and recommended me to use it a while ago.
        if (process.env.NODE_ENV === "development") {
            this.prisma.$on("query", event => {
                try {
                    const paramsArray = JSON.parse(event.params);
                    const newQuery = event.query.replaceAll(
                        /\$(\d+)/g,
                        (_, number) => {
                            const value = paramsArray[Number(number) - 1];

                            if (typeof value === "string") return `"${value}"`;
                            else if (Array.isArray(value))
                                return `'${JSON.stringify(value)}'`;

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

        this.__dirname = resolve();

        this.languageHandler = new LanguageHandler(this);
        this.languageHandler.loadLanguages();

        this.applicationCommands = new Map();
        this.applicationCommandHandler = new ApplicationCommandHandler(this);
        this.applicationCommandHandler.loadApplicationCommands();

        this.events = new Map();
        this.loadEvents();
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
                const event = new EventFile.default(this) as EventHandler;

                event.listen();

                return this.events.set(event.name, event);
            });
    }

    /**
     * Submit a metric to prometheus.
     * @param key The key of the metric to submit to.
     * @param method The method to use to submit the metric.
     * @param value The value to submit to the metric.
     * @param labels The labels to submit to the metric.
     */
    public submitMetric<K extends keyof typeof metrics>(
        key: K,
        method: "set" | "inc",
        value: number,
        labels: Partial<Record<typeof metrics[K]["labelNames"][number], string>>
    ) {
        const gauge = this.gauges.get(key);
        if (!gauge) return;

        return gauge[method](labels, value);
    }
}
