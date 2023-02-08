import { register } from "prom-client";
import { fastify, FastifyInstance } from "fastify";
import fastifyMetricsPlugin from "fastify-metrics";
import Logger from "./Logger.js";
import ExtendedClient from "../extensions/ExtendedClient.js";

export default class Server {
    /** Our extended client. */
    public readonly client: ExtendedClient;

    /** The port the server should run on. */
    private readonly port: number;

    /** Our Fastify instance. */
    private readonly router: FastifyInstance;

    /**
     * Create our Fastify server.
     * @param client Our extended client.
     * @param port The port hte server should run on.
     */
    constructor(client: ExtendedClient, port: number) {
        this.client = client;
        this.port = port;

        this.router = fastify({ logger: false, trustProxy: 1 });
    }

    /**
     * Start our Fastify server.
     */
    public async start() {
        await this.router.register(fastifyMetricsPlugin, {
            defaultMetrics: {
                enabled: false,
                register
            },
            endpoint: null
        });

        this.registerRoutes();

        this.router.listen(
            { port: this.port, host: "0.0.0.0" },
            (error, address) => {
                if (error) {
                    Logger.error(error);
                    Logger.sentry.captureException(error);

                    process.exit(1);
                }

                Logger.info(`Fastify server started, listening on ${address}.`);
            }
        );
    }

    /**
     * Register all of the routes on our Fastify server.
     */
    private registerRoutes() {
        this.router.get("/ping", (_, response) => {
            return response.send("PONG!");
        });

        this.router.get("/metrics", async (request, response) => {
            if (
                request.headers.authorization?.replace("Bearer ", "") !==
                process.env.PROMETHEUS_AUTH
            )
                return response
                    .status(401)
                    .send("Invalid authorization token.");

            const metrics = await register.metrics();

            return response.send(metrics);
        });

        this.router.get("/", (_, response) => {
            return response.redirect("https://polar.blue");
        });
    }
}

