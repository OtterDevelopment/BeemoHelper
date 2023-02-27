import EventHandler from "../../../lib/classes/EventHandler.js";

export default class Debug extends EventHandler {
    /**
     * Handle a debug event.
     * @param info The debug info.
     */
    public override async run(info: string) {
        if (info.includes("Heartbeat acknowledged, latency of")) {
            const matches = info.matchAll(/\d+/g);

            const [shardId, latency] = [...matches].map(match =>
                Number(match[0])
            );

            this.client.submitMetricToManager("latency", "set", latency, {
                shard: shardId.toString()
            });
        }

        if (process.env.NODE_ENV === "development")
            this.client.logger.debug(info);
    }
}

