declare global {
    namespace NodeJS {
        interface ProcessEnv {
            MONGO_URI: string;
            NODE_ENV: "development" | "production";
            DISCORD_TOKEN: string;
            DISCORD_TOKEN_2: string;
            SENTRY_DSN?: string;
            DATADOG_API_KEY?: string;
            DEVELOPMENT_GUILD_ID?: string;
        }
    }
}

export {};

