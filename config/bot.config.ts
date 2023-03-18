import {
    ActivityType,
    GatewayIntentBits,
    GatewayPresenceUpdateData,
    PermissionFlagsBits
} from "@discordjs/core";

export default {
    /** The prefix the bot will use for text commands, the prefix is different depending on the NODE_ENV. */
    prefixes: process.env.NODE_ENV === "production" ? ["b!"] : ["b!!"],
    /** The name the bot should use across the bot. */
    botName: "Beemo Helper",

    /** The bot's current version, this is the first 7 characters from the current Git commit hash. */
    version: "???",
    /** A list of users that are marked as administrators of the bot, these users have access to eval commands. */
    admins: ["619284841187246090"],
    /* The ID for the test guild  */
    testGuildId: "925264080250494977",

    /** A link to our bot's Discord support server. */
    supportServer: "https://discord.gg/VvE5ucuJmW",
    /** An object of type Record<number, string>, which relates to the number of an instance of the bot, and the invite, all invites uses the most minimal permissions as possible. */
    minimalInvite: {
        1: "https://discord.com/api/oauth2/authorize?client_id=769772015447703592&permissions=52228&redirect_uri=https%3A%2F%2Fdiscord.gg%2FhkDuZfpfBB&scope=bot%20applications.commands",
        2: "https://canary.discord.com/api/oauth2/authorize?client_id=990765511950348298&permissions=52228&scope=applications.commands+bot"
    },
    /** A link to the GitHub repository for the bot. */
    gitHub: "https://github.com/OtterDevelopment/BeemoHelper",

    /** The presence that should be displayed when the bot starts running. */
    presence: {
        status: "online",
        activities: [
            {
                type: ActivityType.Playing,
                name: "with /help"
            }
        ]
    } as GatewayPresenceUpdateData,

    /** The hastebin server that we should use for uploading logs. */
    hastebin: "https://haste.polars.cloud",

    /** An object of the type Record<string, string>, the key corelating to when the value (a hexadecimal code) should be used. */
    colors: {
        primary: 0x5865f2,
        success: 0x57f287,
        warning: 0xfee75c,
        error: 0xed4245
    },

    /** The list of intents the bot requires to function. */
    intents:
        GatewayIntentBits.Guilds |
        GatewayIntentBits.GuildModeration |
        GatewayIntentBits.GuildMembers |
        GatewayIntentBits.GuildMessages |
        GatewayIntentBits.DirectMessages |
        GatewayIntentBits.MessageContent,
    /** A list of permissions that the bot needs to function at all. */
    requiredPermissions:
        PermissionFlagsBits.EmbedLinks | PermissionFlagsBits.SendMessages,

    otherConfig: {
        beemoGlobalLogChannelId: "833694540853936188",
        helperGlobalLogChannelId: "878542336928415805"
    }
};
