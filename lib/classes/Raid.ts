/* eslint-disable no-await-in-loop */
import { Guild, Snowflake } from "discord.js";
import BetterClient from "../extensions/BetterClient.js";

export default class Raid {
    /**
     * Our client.
     */
    public readonly client: BetterClient;

    /**
     * The Guild that the raid is going on in.
     */
    private readonly guild: Guild;

    /**
     * The URL of the Beemo log.
     */
    private readonly logUrl: string;

    /**
     * The IDs of the users that participated in the raid.
     */
    public readonly userIds: Snowflake[];

    /**
     * The IDs of the users that were banned.
     */
    public bannedMembers: Snowflake[];

    /**
     * Create our Raid.
     * @param client Our client.
     * @param guild The Guild that the raid is going on in.
     * @param logUrl The URL of the Beemo log.
     * @param userIds The IDs of the users that participated in the raid.
     */
    constructor(
        client: BetterClient,
        guild: Guild,
        logUrl: string,
        userIds: string[]
    ) {
        this.client = client;
        this.logUrl = logUrl;
        this.userIds = userIds;
        this.guild = guild;
        this.bannedMembers = [];
    }

    /**
     * Start the anti raid.
     */
    public async start() {
        await this.guild.members.fetch();
        await this.banMembers();
    }

    /**
     * Start banning members of the raid.
     */
    private async banMembers() {
        const members = this.userIds.filter(userId =>
            this.client.guilds.cache
                .get(this.guild.id)
                ?.members.cache.has(userId)
        );
        if (members.length)
            return this.client.logger.info(
                `Skipping raid in ${this.guild.name} [${this.guild.id}] (${this.logUrl}) as there are 0 members to ban out of ${this.userIds.length} total raiders.`
            );
        this.client.logger.info(
            `Starting bans in ${this.guild.name} [${this.guild.id}] (${this.logUrl}), there are currently ${members.length} members in the guild out of ${this.userIds.length} total raiders.`
        );
        for (const userId of this.userIds) {
            if (
                !this.client.guilds.cache
                    .get(this.guild.id)
                    ?.members.cache.has(userId)
            ) {
                this.client.logger.info(
                    `Skipping over ${userId} (${
                        this.userIds.indexOf(userId) + 1
                    }/${this.userIds.length}) because they are not in ${
                        this.guild.name
                    } [${this.guild.id}] (${this.logUrl})`
                );
                // eslint-disable-next-line no-continue
                continue;
            }
            try {
                await this.guild.bans.create(userId, {
                    reason: `This user was detected as a userbot by Beemo in ${this.logUrl}.`,
                    days: 1
                });
                this.client.logger.info(
                    `Banned ${userId} (${this.userIds.indexOf(userId) + 1}/${
                        this.userIds.length
                    }) from ${this.guild.name} [${this.guild.id}] (${
                        this.logUrl
                    })`
                );
                this.bannedMembers.push(userId);
            } catch (error: any) {
                if (error.code === 10013)
                    return this.client.logger.info(
                        `Skipping over ${userId} (${
                            this.userIds.indexOf(userId) + 1
                        }/${
                            this.userIds.length
                        }) because they are not a valid user in ${
                            this.guild.name
                        } [${this.guild.id}] (${this.logUrl})`
                    );
                else if (error.code === 50013)
                    return this.client.logger.info(
                        `Skipping over ${userId} (${
                            this.userIds.indexOf(userId) + 1
                        }/${
                            this.userIds.length
                        }) because I don't have enough permissions to ban them in ${
                            this.guild.name
                        } [${this.guild.id}] (${this.logUrl})`
                    );
                else {
                    this.client.logger.error(error);
                    this.client.logger.sentry.captureWithExtras(error, {
                        event: "Beemo Message Create",
                        guild: this.guild
                    });
                }
                // eslint-disable-next-line no-continue
                continue;
            }
        }
    }
}
