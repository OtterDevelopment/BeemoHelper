import { GatewayDispatchPayload } from "discord.js";
import EventHandler from "../../../lib/classes/EventHandler.js";

export default class Raw extends EventHandler {
    /**
     * Handle a gateway dispatch event.
     */
    public override async run(event: GatewayDispatchPayload) {
        this.client.submitMetricToManager("websocket_events", "inc", 1, {
            shard: (this.client.shard?.ids[0] ?? 0).toString(),
            type: event.t
        });
    }
}

