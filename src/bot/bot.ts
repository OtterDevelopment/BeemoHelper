import { Collection, GuildMember, LimitedCollection, User } from "discord.js";
import Config from "../../config/bot.config.js";
import BetterClient from "../../lib/extensions/BetterClient.js";

const client = new BetterClient({
    allowedMentions: { parse: ["users"] },
    restTimeOffset: 10,
    restGlobalRateLimit: 50,
    invalidRequestWarningInterval: 500,
    presence: Config.presence,
    intents: Config.intents,
    makeCache: manager => {
        if (["UserManager", "GuildMemberManager"].includes(manager.name))
            return new LimitedCollection({
                maxSize: 1,
                keepOverLimit: (user: User | GuildMember) =>
                    user.id === user.client.user?.id ||
                    (user.client as BetterClient).usersUsingBot?.has(user.id) ||
                    !!(user.client as BetterClient).activeRaids.find(
                        raid => raid.indexOf(user.id) !== -1
                    ),
                sweepInterval: 30
            });
        return new Collection();
    }
});

client.login().catch(error => {
    client.logger.error(error);
    client.logger.sentry.captureException(error);
});
