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
        await Promise.all(
            (
                [
                    this.client.applicationCommandHandler.registerApplicationCommands()
                ] as any
            ).concat(
                (this.client.shard?.ids[0] ?? 0) === 0
                    ? [this.client.server.start()]
                    : []
            )
        );

        let userCount = 0;
        const guilds = this.client.guilds.cache.map(guild => {
            userCount += guild.memberCount;
            return `${guild.name} [${guild.id}] - ${guild.memberCount} members.`;
        });

        this.client.metrics.updateGuildCount(
            this.client.guilds.cache.size,
            client.shard?.ids[0] ?? 0
        );
        this.client.metrics.updateUserCount(
            userCount,
            client.shard?.ids[0] ?? 0
        );

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

        return client.user?.setPresence(this.client.config.presence);
    }
}

