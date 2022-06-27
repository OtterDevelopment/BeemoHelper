import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";
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
     * Our REST clients for this raid.
     */
    private restClients: REST[] = [
        new REST({}).setToken(process.env.DISCORD_TOKEN),
        new REST({}).setToken(process.env.DISCORD_TOKEN_2)
    ];

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
        try {
            await this.guild.members.fetch({
                force: true
            });
        } catch (error: any) {
            this.client.logger.error(error);
            return this.client.logger.sentry.captureWithExtras(error, {
                event: "Beemo Message Create",
                guild: this.guild
            });
        }
        await this.banMembers();
    }

    /**
     * Start banning members of the raid.
     */
    private async banMembers() {
        const members = this.userIds.filter(userId =>
            this.guild.members.cache.has(userId)
        );
        if (!members.length)
            return this.client.logger.info(
                `Skipping raid in ${this.guild.name} [${this.guild.id}] (${this.logUrl}) as there are 0 members to ban out of ${this.userIds.length} total raiders.`
            );
        this.client.logger.info(
            `Starting bans in ${this.guild.name} [${this.guild.id}] (${this.logUrl}), there are currently ${members.length} members in the guild out of ${this.userIds.length} total raiders.`
        );
        await Promise.all([
            this.userIds.map(userId => {
                if (
                    !this.client.guilds.cache
                        .get(this.guild.id)
                        ?.members.cache.has(userId)
                ) {
                    return this.client.logger.info(
                        `Skipping over ${userId} (${
                            this.userIds.indexOf(userId) + 1
                        }/${this.userIds.length}) because they are not in ${
                            this.guild.name
                        } [${this.guild.id}] (${this.logUrl})`
                    );
                }
                return this.restClients[this.bannedMembers.length % 2]
                    .put(Routes.guildBan(this.guild.id, userId), {
                        reason: `This user was detected as a userbot by Beemo in ${this.logUrl}.`
                    })
                    .then(() => {
                        this.client.logger.info(
                            `Banned ${userId} (${
                                this.userIds.indexOf(userId) + 1
                            }/${this.userIds.length}) from ${
                                this.guild.name
                            } [${this.guild.id}] (${this.logUrl})`
                        );
                        this.bannedMembers.push(userId);
                    })
                    .catch(error => {
                        if (error.code === 10013)
                            this.client.logger.info(
                                `Skipping over ${userId} (${
                                    this.userIds.indexOf(userId) + 1
                                }/${
                                    this.userIds.length
                                }) because they are not a valid user in ${
                                    this.guild.name
                                } [${this.guild.id}] (${this.logUrl})`
                            );
                        else if (error.code === 50013)
                            this.client.logger.info(
                                `Skipping over ${userId} (${
                                    this.userIds.indexOf(userId) + 1
                                }/${
                                    this.userIds.length
                                }) because I don't have enough permissions to ban them in ${
                                    this.guild.name
                                } [${this.guild.id}] (${this.logUrl})`
                            );
                        else if (error.code === 30035)
                            return this.client.logger.info(
                                `Stopping bans in ${this.guild.name} [${this.guild.id}] (${this.logUrl}) as the ban limit has been reached.`
                            );
                        else {
                            this.client.logger.error(error);
                            this.client.logger.sentry.captureWithExtras(error, {
                                event: "Beemo Message Create",
                                guild: this.guild
                            });
                        }
                    });
            })
        ]);
    }
}

