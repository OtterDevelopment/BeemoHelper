import { Guild } from "discord.js";
import EventHandler from "../../../lib/classes/EventHandler.js";

export default class GuildDelete extends EventHandler {
    /**
     * Handle leaving a guild.
     * @param guild The guild that was left.
     */
    override async run(guild: Guild) {
        if (!guild.name) return;

        const stats = await this.client.fetchStats();

        this.client.metrics.updateGuildCount(stats.guilds);
        this.client.metrics.updateUserCount(stats.users);

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

