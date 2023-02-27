import { Client, ClientEvents } from "discord.js";
import EventHandler from "../../../lib/classes/EventHandler.js";
import ExtendedClient from "../../../lib/extensions/ExtendedClient.js";

export default class Ready extends EventHandler {
    constructor(client: ExtendedClient, name: keyof ClientEvents) {
        super(client, name, true);
    }

    /**
     * Handle the client being ready.
     */
    public override async run(client: Client) {
        await this.client.applicationCommandHandler.registerApplicationCommands();

        let userCount = 0;
        const guilds = this.client.guilds.cache.map(guild => {
            userCount += guild.memberCount;
            return `${guild.name} [${guild.id}] - ${guild.memberCount} members.`;
        });

        this.client.submitMetricToManager(
            "guild_count",
            "set",
            this.client.guilds.cache.size,
            {
                shard: (client.shard?.ids[0] ?? 0).toString()
            }
        );
        this.client.submitMetricToManager("user_count", "set", userCount, {
            shard: (client.shard?.ids[0] ?? 0).toString()
        });

        const hasteURL = await this.client.functions.uploadToHastebin(
            `Currently in ${
                this.client.guilds.cache.size
            } guilds with ${userCount} users on Shard ${
                client.shard?.ids[0]
            }.\n\n${guilds.join("\n\n")}`
        );

        this.client.logger.info(
            `Logged in as ${client.user?.tag} [${client.user?.id}] on Shard ${
                client.shard?.ids[0]
            } with ${this.client.guilds.cache.size} guilds ${
                hasteURL ? `(${hasteURL}) ` : ""
            }and ${userCount} users.`
        );

        await this.client.logger.webhookLog("console", {
            content: `${this.client.functions.generateTimestamp()} Logged in as ${
                client.user?.tag
            } [${client.user?.id}] on Shard ${client.shard?.ids[0]} with ${
                this.client.guilds.cache.size
            } guilds ${
                hasteURL ? `(${hasteURL}) ` : ""
            }and ${userCount} users.`,
            username: `${this.client.config.botName} | Console Logs`
        });

        return client.user?.setPresence(this.client.config.presence);
    }
}

