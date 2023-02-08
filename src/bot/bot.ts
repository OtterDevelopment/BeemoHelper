import { Options } from "discord.js";
import Config from "../../config/bot.config.js";
import ExtendedClient from "../../lib/extensions/ExtendedClient.js";

const client: ExtendedClient = new ExtendedClient({
    allowedMentions: { parse: ["users"] },
    rest: {
        offset: 10,
        globalRequestsPerSecond: 50,
        invalidRequestWarningInterval: 500
    },
    presence: Config.presence,
    intents: Config.intents,
    makeCache: Options.cacheWithLimits({
        ...Options.DefaultMakeCacheSettings,
        ReactionManager: 0,
        AutoModerationRuleManager: 0,
        BaseGuildEmojiManager: 0,
        GuildBanManager: 0,
        GuildEmojiManager: 0,
        GuildInviteManager: 0,
        GuildMemberManager: {
            maxSize: 200,
            keepOverLimit: member => {
                client.logger.debug("ffsdfsd", client.user?.id);

                return (
                    client.usersUsingBot.has(member.id) ||
                    member.id === member.client.user?.id
                );
            }
        },
        GuildScheduledEventManager: 0,
        GuildStickerManager: 0,
        PresenceManager: 0,
        ReactionUserManager: 0,
        VoiceStateManager: 0,
        UserManager: {
            maxSize: 200,
            keepOverLimit: user =>
                client.usersUsingBot.has(user.id) ||
                user.id === user.client.user?.id
        },
        MessageManager: { maxSize: 50 }
    })
});

client.login().catch(error => {
    client.logger.error(error);
    client.logger.sentry.captureException(error);
});
