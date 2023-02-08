import { load } from "dotenv-extended";
import { execSync } from "child_process";
import { ShardingManager } from "discord.js";
import Config from "../config/bot.config.js";
import Logger from "../lib/classes/Logger.js";
import Functions from "../lib/utilities/functions.js";

load({
    path: process.env.NODE_ENV === "production" ? ".env.prod" : ".env.dev"
});

Config.version = execSync("git rev-parse HEAD").toString().trim().slice(0, 7);

const manager = new ShardingManager("./dist/src/bot/bot.js", {
    token: process.env.DISCORD_TOKEN
});

manager
    .spawn({
        timeout: -1
    })
    .then(shards => {
        shards.forEach(shard => {
            shard.on("message", message => {
                if ("_eval" in message && "_result" in message)
                    Logger.info(
                        `Shard[${shard.id}]: ${message._eval} : ${message._result}`
                    );

                if ("type" in message) {
                    Logger.info(`Shard[${shard.id}]:`, message);
                    if (message.type === "raid") {
                        const shardId =
                            (message.guildId >> 22) % shard.manager.shards.size;

                        Logger.debug(shardId);

                        manager.shards
                            .get(shardId)
                            ?.emit("beemoMessageCreate", message);
                    }
                }
            });
        });
    })
    .catch(error => {
        Logger.error(error);
        Logger.sentry.captureException(error);
    });

manager.on("shardCreate", shard => {
    Logger.info(`Staring shard ${shard.id}.`);
    if (shard.id + 1 === manager.totalShards) {
        shard.once("ready", () => {
            setTimeout(async () => {
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
                    userCount = clientUserCount;
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
            }, 200);
        });
    }
});
