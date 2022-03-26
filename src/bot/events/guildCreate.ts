import { Guild } from "discord.js";
import EventHandler from "../../../lib/classes/EventHandler.js";

export default class GuildCreate extends EventHandler {
    override async run(guild: Guild) {
        const stats = await this.client.fetchStats();
        this.client.dataDog.gauge("guilds", stats.guilds);
        this.client.dataDog.gauge("users", stats.users);
        this.client.logger.info(
            `Joined guild ${guild.name} (${guild.id}) with ${guild.memberCount} members, now in ${stats.guilds} guilds(s)!`
        );
        this.client.user?.setPresence({
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
        return this.client.logger.webhookLog("guild", {
            content: `**__Joined a New Guild (${
                stats.guilds
            } Total)__**\n**Guild Name:** \`${guild.name}\`\n**Guild ID:** \`${
                guild.id
            }\`\n**Guild Owner:** <@${guild.ownerId}> \`[${
                guild.ownerId
            }]\`\n**Guild Member Count:** \`${
                guild.memberCount || 2
            }\`\n**Timestamp:** ${this.client.functions.generateTimestamp()}`,
            username: `${this.client.config.botName} | Guild Logs`
        });
    }
}
