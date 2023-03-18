import {
    APIInteraction,
    GatewayDispatchEvents,
    InteractionType,
    WithIntrinsicProps
} from "@discordjs/core";
import EventHandler from "../../../lib/classes/EventHandler.js";
import ExtendedClient from "../../../lib/extensions/ExtendedClient.js";

export default class InteractionCreate extends EventHandler {
    constructor(client: ExtendedClient) {
        super(client, GatewayDispatchEvents.InteractionCreate);
    }

    /**
     * Handle the creation of a new interaction.
     */
    public override async run({
        data,
        shardId
    }: WithIntrinsicProps<APIInteraction>) {
        this.client.logger.debug(2);

        // This is very cursed, but it works.
        const d = data.data as any;

        this.client.submitMetric("interactions_created", "inc", 1, {
            name: d?.name ?? d?.custom_id ?? "null",
            type: data.type.toString(),
            shard: shardId.toString()
        });

        if (data.type === InteractionType.ApplicationCommand)
            return this.client.applicationCommandHandler.handleApplicationCommand(
                {
                    data,
                    shardId
                }
            );
    }
}
