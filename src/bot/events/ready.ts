import { ClientEvents } from "discord.js";
import EventHandler from "../../../lib/classes/EventHandler.js";
import BetterClient from "../../../lib/extensions/BetterClient.js";

export default class Ready extends EventHandler {
    constructor(client: BetterClient, name: keyof ClientEvents) {
        super(client, name, true);
    }

    override async run() {
        await this.client.application?.fetch();
        const allGuilds = await this.client.shard?.broadcastEval(async c =>
            c.guilds.cache.map(
                guild =>
                    `${guild.name} [${guild.id}] - ${guild.memberCount} members.`
            )
        );
        const guildsStringList: string[] = [];
        // @ts-ignore
        for (let i = 0; i < allGuilds.length; i++) {
            // @ts-ignore
            guildsStringList.push(`Shard ${i + 1}\n${allGuilds[i].join("\n")}`);
        }
        const stats = await this.client.fetchStats();
        this.client.logger.info(
            `Logged in as ${this.client.user?.tag} [${
                this.client.user?.id
            }] with ${
                stats.guilds
            } guilds (${await this.client.functions.uploadHaste(
                `Currently in ${stats.guilds} guilds with ${
                    stats.users
                } users.\n\n${guildsStringList.join("\n\n")}`
            )}) and ${stats.users} users.`
        );
        this.client.dataDog.gauge("guilds", stats.guilds);
        this.client.dataDog.gauge("users", stats.users);
        return this.client.user?.setPresence({
            status: process.env.NODE_ENV === "development" ? "idle" : "online",
            activities: [
                {
                    type:
                        process.env.NODE_ENV === "development"
                            ? "PLAYING"
                            : "WATCHING",
                    name:
                        process.env.NODE_ENV === "development"
                            ? "Currently in maintenance mode!"
                            : `/help | Watching over ${stats.users.toLocaleString()} users!`
                }
            ]
        });
    }
}

