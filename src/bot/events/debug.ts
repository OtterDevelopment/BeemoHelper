import EventHandler from "../../../lib/classes/EventHandler.js";

export default class Debug extends EventHandler {
    /**
     * Handle a debug event.
     */
    public override async run(info: string) {
        if (process.env.NODE_ENV === "development")
            this.client.logger.debug(info);
    }
}

