declare global {
    namespace NodeJS {
        interface ProcessEnv {
            NODE_ENV: "development" | "production";

            DISCORD_TOKEN: string;
            SENTRY_DSN: string;
            DATABASE_URL: string;

            CONSOLE_HOOK: string;
            GUILD_HOOK: string;

            DATADOG_API_KEY: string;

            DEVELOPMENT_GUILD_ID: string;
            FASTIFY_PORT: string;
        }
    }
}

export {};

