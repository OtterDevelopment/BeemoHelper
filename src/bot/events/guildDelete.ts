import { Guild } from "discord.js";
import EventHandler from "../../../lib/classes/EventHandler.js";

export default class GuildDelete extends EventHandler {
    override async run(guild: Guild) {
        this.client.dataDog.increment("events", 1, ["event:guildDelete"]);
        const stats = await this.client.fetchStats();
        this.client.dataDog.gauge("guilds", stats.guilds);
        this.client.dataDog.gauge("users", stats.users);
        this.client.logger.info(
            `Left guild ${guild.name} (${guild.id}) with ${guild.memberCount} members, now in ${stats.guilds} guilds(s)!`
        );
        return this.client.logger.webhookLog("guild", {
            content: `**__Left a Guild (${
                stats.guilds
            } Total)__**\n**Guild Name:** \`${guild.name}\`\n**Guild ID:** \`${
                guild.id
            }\`\n**Guild Owner:** <@${guild.ownerId}> \`[${
                guild.ownerId
            }]\`\n**Guild Member Count:** \`${
                guild.memberCount || 2
            }\`\n**Timestamp:** <t:${Math.floor(Date.now() / 1000)}:F>`,
            username: `${this.client.config.botName} | Guild Logs`
        });
    }
}
