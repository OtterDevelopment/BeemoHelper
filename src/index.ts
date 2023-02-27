import { Gauge } from "prom-client";
import { load } from "dotenv-extended";
import { ShardingManager } from "discord.js";
import Server from "../lib/classes/Server.js";
import Logger from "../lib/classes/Logger.js";
import botConfig from "../config/bot.config.js";
import metrics from "../lib/classes/Metrics.js";
import Functions from "../lib/utilities/functions.js";

load({
    path: process.env.NODE_ENV === "production" ? ".env.prod" : ".env.dev"
});

const manager = new ShardingManager("./dist/src/bot/bot.js", {
    token: process.env.DISCORD_TOKEN
});

interface ShardMetricMessage<Key extends keyof typeof metrics> {
    type: "metric";
    method: "set" | "inc";
    key: Key;
    value: number;
    labels: Partial<Record<typeof metrics[Key]["labelNames"][number], string>>;
}

const server = new Server(parseInt(process.env.FASTIFY_PORT, 10));
const gauges = new Map<keyof typeof metrics, Gauge>();

Object.entries(metrics).forEach(([key, gauge]) => {
    gauges.set(
        key as keyof typeof metrics,
        new Gauge({
            name: key,
            ...gauge
        })
    );
});

server.start().then(() =>
    manager
        .spawn({
            timeout: -1
        })
        .then(async shards => {
            shards.forEach(shard => {
                shard.on("message", message => {
                    if ("_eval" in message && "_result" in message)
                        Logger.info(
                            `Shard[${shard.id}]: ${message._eval} : ${message._result}`
                        );

                    if ("type" in message) {
                        if (message.type === "raid") {
                            const shardId =
                                (message.guildId >> 22) %
                                shard.manager.shards.size;

                            manager.shards
                                .get(shardId)
                                ?.eval(
                                    (client, { m }) =>
                                        client.emit("beemoMessageCreate", m),
                                    { m: message }
                                );
                        } else if (message.type === "metric") {
                            const typedMessage = message as ShardMetricMessage<
                                keyof typeof metrics
                            >;

                            const gauge = gauges.get(typedMessage.key);

                            if (gauge) {
                                if (typedMessage.method === "set")
                                    gauge.set(
                                        typedMessage.labels,
                                        typedMessage.value
                                    );
                                else if (typedMessage.method === "inc")
                                    gauge.inc(
                                        typedMessage.labels,
                                        typedMessage.value
                                    );
                            }
                        }
                    }
                });
            });
        })
        .catch(error => {
            Logger.error(error);
            Logger.sentry.captureException(error);
        })
);

manager.on("shardCreate", shard => {
    Logger.info(`Staring shard ${shard.id}.`);
    if (shard.id + 1 === manager.totalShards) {
        shard.once("ready", () => {
            setTimeout(async () => {
                if (!shard.ready) return;

                const broadcastResult = await shard.manager.broadcastEval(
                    async c => {
                        let userCount = 0;

                        return [
                            c.guilds.cache.map(guild => {
                                userCount += guild.memberCount;
                                return `${guild.name} [${guild.id}] - ${guild.memberCount} members.`;
                            }),
                            c.guilds.cache.size,
                            userCount
                        ];
                    }
                );

                let userCount = 0;
                let guildCount = 0;

                const guildsStringList = [];

                for (let i = 0; i < broadcastResult.length; i++) {
                    const [guilds, clientGuildCount, clientUserCount] =
                        broadcastResult[i] as [string[], number, number];

                    guildsStringList.push(
                        `Shard ${i + 1}\n${(guilds as string[]).join("\n")}`
                    );

                    guildCount += clientGuildCount;
                    userCount += clientUserCount;
                }

                const hasteURL = await Functions.uploadToHastebin(
                    `Currently in ${guildCount} guilds with ${userCount} users.\n\n${guildsStringList.join(
                        "\n\n"
                    )}`
                );

                Logger.info(
                    `Ready on ${manager.totalShards} shard${
                        manager.totalShards === 1 ? "" : "s"
                    } with ${guildCount} guilds ${
                        hasteURL ? `(${hasteURL}) ` : ""
                    }and ${userCount} users.`
                );

                Logger.webhookLog("console", {
                    content: `${Functions.generateTimestamp()} Ready on ${
                        manager.totalShards
                    } shard${
                        manager.totalShards === 1 ? "" : "s"
                    } with ${guildCount} guilds ${
                        hasteURL ? `(${hasteURL}) ` : ""
                    }and ${userCount} users.`,
                    username: `${botConfig.botName} | Console Logs`
                });
            }, 5000);
        });
    }
});
