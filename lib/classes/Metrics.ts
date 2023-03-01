const metrics = {
    commands_used: {
        help: "The usage of each command.",
        labelNames: ["command", "type", "success", "shard"] as const
    },
    autocomplete_responses: {
        help: "The number of autocomplete responses sent.",
        labelNames: ["name", "shard"] as const
    },
    interactions_created: {
        help: "The number of interactions created.",
        labelNames: ["name", "type", "shard"] as const
    },
    user_locales: {
        help: "What users have their language set to.",
        labelNames: ["locale", "shard"] as const
    },
    guild_count: {
        help: "The number of guilds the server is in.",
        labelNames: ["shard"] as const
    },
    user_count: {
        help: "The number of users the bot can see.",
        labelNames: ["shard"] as const
    },
    latency: {
        help: "The latency of the bot.",
        labelNames: ["shard"] as const
    },
    websocket_events: {
        help: "The number of websocket events the bot has received.",
        labelNames: ["type", "shard"] as const
    },
    total_raid_users: {
        help: "The total number of users the bot has detected in raids.",
        labelNames: ["shard", "guildId"] as const
    },
    total_raid_bans: {
        help: "The total number of users the bot has banned in raids.",
        labelNames: ["shard", "guildId"] as const
    },
    failed_raids: {
        help: "The total number of raids that have failed for any reason.",
        labelNames: ["shard", "guildId", "reason"] as const
    },
    failed_bans: {
        help: "The total number of bans that have failed for any reason.",
        labelNames: ["shard", "guildId", "reason"] as const
    },
    successful_raids: {
        help: "The total number of raids that have been successfully detected.",
        labelNames: ["shard", "guildId", "raidersBanned"] as const
    }
};

export default metrics;
