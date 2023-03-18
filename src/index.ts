import { REST } from "@discordjs/rest";
import { load } from "dotenv-extended";
import { WebSocketManager, WorkerShardingStrategy } from "@discordjs/ws";
import botConfig from "../config/bot.config.js";
import ExtendedClient from "../lib/extensions/ExtendedClient.js";

load({
    path: process.env.NODE_ENV === "production" ? ".env.prod" : ".env.dev"
});

// Create REST and WebSocket managers directly.
const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
const ws = new WebSocketManager({
    token: process.env.DISCORD_TOKEN,
    intents: botConfig.intents,
    initialPresence: botConfig.presence,
    rest,
    shardCount: 6,
    shardIds: {
        start: 0,
        end: 5
    },
    // This will cause 2 workers to spawn, 3 shards per worker.
    // "each shard gets its own bubble which handles decoding, heartbeats, etc. And your main thread just gets the final result" - Vlad.
    buildStrategy: manager =>
        new WorkerShardingStrategy(manager, { shardsPerWorker: 3 })
});

new ExtendedClient({ rest, ws });
ws.connect().catch(error => {
    // eslint-disable-next-line no-console
    console.log(1, error);
});
