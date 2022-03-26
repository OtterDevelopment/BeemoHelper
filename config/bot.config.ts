import { Intents, PermissionString, PresenceData } from "discord.js";

export default {
    prefixes: process.env.NODE_ENV === "production" ? ["b!"] : ["b!!"],
    botName: "Beemo Helper",

    version: "2.0.0",
    admins: ["619284841187246090"],

    // If your bot isn't public, or open source, or doesn't have a
    // Support server, feel free to remove the following variables.
    supportServer: "https://discord.gg/VvE5ucuJmW",
    minimalInvite:
        "https://discord.com/api/oauth2/authorize?client_id=769772015447703592&permissions=52228&redirect_uri=https%3A%2F%2Fdiscord.gg%2FhkDuZfpfBB&scope=bot%20applications.commands",
    gitHub: "https://github.com/OtterDevelopment/BeemoHelper",

    presence: {
        status: "online",
        activities: [
            {
                type: "PLAYING",
                name: "with /help"
            }
        ]
    } as PresenceData,

    hastebin: "https://h.inv.wtf",

    // To replace these colors please make sure you are providing a
    // hexadecimal color.
    colors: {
        primary: "5865F2",
        success: "57F287",
        warning: "FEE75C",
        error: "ED4245"
    },

    // Properly update the following intents list for the bot to
    // Function properly, it currently only listens for guilds
    // And interactions.
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_BANS,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_MESSAGES
    ],

    // If your bot requires any permissions other than the ones below
    // Add them and all commands and interactions will only work if
    // The bot has said permissions in the environment they're run in.
    requiredPermissions: [
        "EMBED_LINKS",
        "SEND_MESSAGES",
        "USE_EXTERNAL_EMOJIS"
    ] as PermissionString[],

    dataDog: {
        apiKey: process.env.DATADOG_API_KEY,
        baseURL: "https://app.datadoghq.com/api/v1/"
    },

    otherConfig: {
        beemoId: "515067662028636170",
        beemoGlobalLogChannelId: "833694540853936188",
        helperGlobalLogChannelId: "878542336928415805"
    }
};
