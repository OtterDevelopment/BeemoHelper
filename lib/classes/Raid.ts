import {
    Collection,
    DiscordAPIError,
    Guild,
    GuildMember,
    REST,
    Routes
} from "discord.js";
import ExtendedClient from "../extensions/ExtendedClient.js";

export default class Raid {
    /**
     * Our client.
     */
    public readonly client: ExtendedClient;

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
    public readonly userIds: string[];

    /**
     * The IDs of the users that were banned.
     */
    public bannedMembers: string[];

    /**
     * Our REST clients for this raid.
     */
    private restClients = {
        "925267402072154133": new REST({}).setToken(process.env.DISCORD_TOKEN),
        "990765511950348298": new REST({}).setToken(process.env.DISCORD_TOKEN)
    };

    constructor(
        client: ExtendedClient,
        guild: Guild,
        logUrl: string,
        userIds: string[]
    ) {
        this.client = client;
        this.guild = guild;
        this.logUrl = logUrl;
        this.userIds = userIds;

        this.bannedMembers = [];
    }

    public async start() {
        let members;

        try {
            members = await this.guild.members.fetch();
        } catch (error) {
            this.client.logger.error(error);
            return this.client.logger.sentry.captureWithExtras(error, {
                event: "Beemo Message Create",
                guild: this.guild
            });
        }

        return this.banMembers(members);
    }

    private async banMembers(members: Collection<string, GuildMember>) {
        const restClientsToUse = Object.entries(this.restClients)
            .map(([userId, restClient]) =>
                members.has(userId) ? restClient : null
            )
            .filter(Boolean) as REST[];

        const maxNumber = restClientsToUse.length - 1;
        let currentNumber = 0;
        let currentIndex = -1;

        const membersToBan = this.userIds.filter(userId => members.has(userId));
        if (!membersToBan.length) {
            this.client.submitMetricToManager("failed_raids", "inc", 1, {
                guildId: this.guild.id,
                shard: this.guild.shardId.toString(),
                reason: "NO_MEMBERS_TO_BAN"
            });

            return this.client.logger.info(
                `No members to ban in ${this.guild.name} [${this.guild.id}] (${this.logUrl}).`
            );
        }

        this.client.on("guildMemberRemove", guildMember => {
            if (guildMember.guild.id === this.guild.id)
                members.delete(guildMember.id);
        });

        for (const userId of membersToBan) {
            if (!members.has(userId)) {
                this.client.submitMetricToManager("failed_raids", "inc", 1, {
                    guildId: this.guild.id,
                    shard: this.guild.shardId.toString(),
                    reason: "USER_NOT_IN_GUILD"
                });

                this.client.logger.info(
                    `User ${userId} is not in the guild ${this.guild.name} [${this.guild.id}] (${this.logUrl}).`
                );

                continue;
            }

            try {
                currentIndex++;

                await restClientsToUse[currentNumber].put(
                    Routes.guildBan(this.guild.id, userId),
                    {
                        reason: `This user was detected as a userbot by Beemo in ${this.logUrl}.`
                    }
                );

                this.bannedMembers.push(userId);

                this.client.logger.info(
                    `Successfully banned ${userId} (${currentIndex + 1}/${
                        membersToBan.length
                    }) in ${this.guild.name} [${this.guild.id}] (${
                        this.logUrl
                    }).`
                );
                currentNumber =
                    currentNumber >= maxNumber ? 0 : currentNumber + 1;
            } catch (error) {
                if (error instanceof DiscordAPIError) {
                    if (error.code === 50013) {
                        this.client.submitMetricToManager(
                            "failed_bans",
                            "inc",
                            1,
                            {
                                guildId: this.guild.id,
                                shard: this.guild.shardId.toString(),
                                reason: "MISSING_PERMISSIONS"
                            }
                        );

                        this.client.logger.info(
                            `Missing permissions to ban ${userId} (${
                                currentIndex + 1
                            }/${membersToBan.length}) in ${this.guild.name} [${
                                this.guild.id
                            }] (${this.logUrl}).`
                        );
                    } else if (error.code === 30035) {
                        this.client.submitMetricToManager(
                            "failed_bans",
                            "inc",
                            1,
                            {
                                guildId: this.guild.id,
                                shard: this.guild.shardId.toString(),
                                reason: "MAX_BANS"
                            }
                        );

                        return this.client.logger.info(
                            `Can't ban ${userId} (${currentIndex + 1}/${
                                membersToBan.length
                            }) because ${this.guild.name} [${
                                this.guild.id
                            }] has reached it's max guild bans (${
                                this.logUrl
                            }).`
                        );
                    } else if (error.code === 10013) {
                        this.client.submitMetricToManager(
                            "failed_bans",
                            "inc",
                            1,
                            {
                                guildId: this.guild.id,
                                shard: this.guild.shardId.toString(),
                                reason: "INVALID_USER"
                            }
                        );

                        this.client.logger.info(
                            `Can't ban ${userId} (${currentIndex + 1}/${
                                membersToBan.length
                            }) because they are no longer a user from raid in ${
                                this.guild.name
                            } [${this.guild.id}] (${this.logUrl}).`
                        );
                    }
                } else {
                    this.client.logger.error(error);
                    this.client.logger.sentry.captureWithExtras(error, {
                        event: "Beeemo Message Create",
                        guild: this.guild
                    });
                }
            }
        }
    }
}
