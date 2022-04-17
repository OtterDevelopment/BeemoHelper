import Config from "../../config/bot.config.js";
import BetterClient from "../../lib/extensions/BetterClient.js";

const client = new BetterClient({
    allowedMentions: { parse: ["users"] },
    restTimeOffset: 10,
    restGlobalRateLimit: 50,
    invalidRequestWarningInterval: 500,
    presence: Config.presence,
    intents: Config.intents
});

client.login().catch(error => {
    client.logger.error(error);
    client.logger.sentry.captureException(error);
});

