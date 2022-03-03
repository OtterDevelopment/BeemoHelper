import { format } from "util";
import { load } from "dotenv-extended";
import * as Sentry from "@sentry/node";
import { Interaction } from "discord.js";
import BetterMessage from "../extensions/BetterMessage";

load({
    path: process.env.NODE_ENV === "development" ? ".env.dev" : ".env.prod"
});

export default function init() {
    Sentry.init({
        tracesSampleRate: 1,
        dsn: process.env.SENTRY_DSN
    });

    return {
        ...Sentry,

        /**
         * Capture a Sentry error about an interaction.
         * @param error The error to capture.
         * @param interaction The interaction that caused the error.
         * @return The sentry error ID.
         */
        captureWithInteraction: (
            error: any,
            interaction: Interaction
        ): Promise<string> => {
            return new Promise((resolve, _) => {
                Sentry.withScope(scope => {
                    scope.setExtra("Environment", process.env.NODE_ENV);
                    scope.setUser({
                        username: interaction.user.tag,
                        id: interaction.user.id
                    });
                    scope.setExtra("Interaction", format(interaction));

                    resolve(Sentry.captureException(error));
                });
            });
        },

        /**
         * Capture a Sentry error about a message.
         * @param error The error to capture.
         * @param message The message that caused the error.
         * @return The sentry error ID.
         */
        captureWithMessage: (
            error: any,
            message: BetterMessage
        ): Promise<string> => {
            return new Promise((resolve, _) => {
                Sentry.withScope(scope => {
                    scope.setExtra("Environment", process.env.NODE_ENV);
                    scope.setUser({
                        username: message.author.tag,
                        id: message.author.id
                    });
                    scope.setExtra("Message", format(message));

                    resolve(Sentry.captureException(error));
                });
            });
        },

        /**
         * Capture a Sentry error with extra details.
         * @param error The error to capture.
         * @param extras Extra details to add to the error.
         * @return The sentry error ID.
         */
        captureWithExtras: (error: any, extras: Record<string, any>) => {
            return new Promise((resolve, _) => {
                Sentry.withScope(scope => {
                    scope.setExtra("Environment", process.env.NODE_ENV);
                    Object.entries(extras).forEach(([key, value]) =>
                        scope.setExtra(key, format(value))
                    );
                    resolve(Sentry.captureException(error));
                });
            });
        }
    };
}
