export interface LanguageValues {
    LANGUAGE_ENABLED: {};
    LANGUAGE_ID: {};
    LANGUAGE_NAME: {};
    CREATE_INSTANT_INVITE: {};
    KICK_MEMBERS: {};
    BAN_MEMBERS: {};
    ADMINISTRATOR: {};
    MANAGE_CHANNELS: {};
    MANAGE_GUILD: {};
    ADD_REACTIONS: {};
    VIEW_AUDIT_LOG: {};
    PRIORITY_SPEAKER: {};
    STREAM: {};
    VIEW_CHANNEL: {};
    SEND_MESSAGES: {};
    SEND_TTS_MESSAGES: {};
    MANAGE_MESSAGES: {};
    EMBED_LINKS: {};
    ATTACH_FILES: {};
    READ_MESSAGE_HISTORY: {};
    MENTION_EVERYONE: {};
    USE_EXTERNAL_EMOJIS: {};
    VIEW_GUILD_INSIGHTS: {};
    CONNECT: {};
    SPEAK: {};
    MUTE_MEMBERS: {};
    DEAFEN_MEMBERS: {};
    MOVE_MEMBERS: {};
    USE_VAD: {};
    CHANGE_NICKNAME: {};
    MANAGE_NICKNAMES: {};
    MANAGE_ROLES: {};
    MANAGE_WEBHOOKS: {};
    MANAGE_EMOJIS_AND_STICKERS: {};
    USE_APPLICATION_COMMANDS: {};
    REQUEST_TO_SPEAK: {};
    MANAGE_EVENTS: {};
    MANAGE_THREADS: {};
    CREATE_PUBLIC_THREADS: {};
    CREATE_PRIVATE_THREADS: {};
    USE_EXTERNAL_STICKERS: {};
    SEND_MESSAGES_IN_THREADS: {};
    USE_EMBEDDED_ACTIVITIES: {};
    MODERATE_MEMBERS: {};
    PARSE_REGEX: {};
    MS_OTHER: {};
    SECOND_ONE: {};
    SECOND_OTHER: {};
    SECOND_SHORT: {};
    MINUTE_ONE: {};
    MINUTE_OTHER: {};
    MINUTE_SHORT: {};
    HOUR_ONE: {};
    HOUR_OTHER: {};
    HOUR_SHORT: {};
    DAY_ONE: {};
    DAY_OTHER: {};
    DAY_SHORT: {};
    YEAR_ONE: {};
    YEAR_OTHER: {};
    YEAR_SHORT: {};
    MISSING_PERMISSIONS_BASE_TITLE: {};
    MISSING_PERMISSIONS_GUILD_ONLY: { type: any };
    MISSING_PERMISSIONS_OWNER_ONLY: { type: any };
    MISSING_PERMISSIONS_DEVELOPER_ONLY: { type: any };
    MISSING_PERMISSIONS_USER_PERMISSIONS_ONE: {
        missingPermissions: any;
        type: any;
    };
    MISSING_PERMISSIONS_USER_PERMISSIONS_OTHER: {
        missingPermissions: any;
        type: any;
    };
    MISSING_PERMISSIONS_CLIENT_PERMISSIONS_ONE: {
        missingPermissions: any;
        type: any;
    };
    MISSING_PERMISSIONS_CLIENT_PERMISSIONS_OTHER: {
        missingPermissions: any;
        type: any;
    };
    TYPE_ON_COOLDOWN_TITLE: { type: any };
    TYPE_ON_COOLDOWN_DESCRIPTION: { type: any; formattedTime: any };
    NON_EXISTENT_TITLE: { type: any };
    NON_EXISTENT_DESCRIPTION: { type: any; name: any; username: any };
    COOLDOWN_ON_TYPE_TITLE: { type: any };
    COOLDOWN_ON_TYPE_DESCRIPTION: { type: any };
    AN_ERROR_HAS_OCCURRED_TITLE: {};
    AN_ERROR_HAS_OCCURRED_DESCRIPTION: { type: any; name: any };
    AN_ERROR_HAS_OCCURRED_DESCRIPTION_NO_NAME: { type: any };
    PING: {};
    PONG: { roundTrip: any; hostLatency: any; apiLatency: any };
    LANGUAGE_SET_TITLE: {};
    LANGUAGE_SET_DESCRIPTION: { language: any };
    INVALID_INTERACTION_TITLE: {};
    INVALID_INTERACTION_DESCRIPTION: {};
    INVALID_MESSAGE_TITLE: {};
    INVALID_MESSAGE_DESCRIPTION_NOT_OWNED: {};
    ADD_BUTTON_MODAL_TITLE: {};
    ADD_BUTTON_MODAL_INPUT_BUTTON_LABEL_LABEL: {};
    ADD_BUTTON_MODAL_INPUT_BUTTON_LABEL_PLACEHOLDER: {};
    ADD_BUTTON_MODAL_INPUT_BUTTON_URL_LABEL: {};
    ADD_BUTTON_MODAL_INPUT_BUTTON_URL_PLACEHOLDER: {};
    ADD_BUTTON_MODAL_INPUT_BUTTON_EMOJI_LABEL: {};
    ADD_BUTTON_MODAL_INPUT_BUTTON_EMOJI_PLACEHOLDER: {};
    INVALID_BUTTON_LABEL_TITLE: {};
    INVALID_BUTTON_LABEL_DESCRIPTION: {};
    ADDED_BUTTON_TITLE: {};
    ADDED_BUTTON_DESCRIPTION: { messageURL: any };
    INVALID_BUTTON_URL_TITLE: {};
    INVALID_BUTTON_URL_DESCRIPTION: {};
    NO_SPACE_FOR_BUTTON_TITLE: {};
    NO_SPACE_FOR_BUTTON_DESCRIPTION: {};
    NO_COMPONENTS_TITLE: {};
    NO_COMPONENTS_DESCRIPTION: {};
    REMOVING_BUTTONS_TITLE: {};
    REMOVING_BUTTONS_DESCRIPTION: {};
    REMOVED_BUTTONS_TITLE: {};
    REMOVED_BUTTONS_DESCRIPTION: {};
    INVALID_ARGUMENT_TITLE: {};
    INVALID_ARGUMENT_JSON_DESCRIPTION: {};
    EMBED_CREATED_TITLE: {};
    EMBED_CREATED_DESCRIPTION: { embedName: any };
    PREVIEW_EMBED_BUTTON_LABEL: {};
    INVALID_ARGUMENT_EMBED_TITLE: {};
    INVALID_ARGUMENT_EMBED_DELETE_DESCRIPTION: {};
    INVALID_ARGUMENT_EMBED_PREVIEW_DESCRIPTION: {};
    INVALID_ARGUMENT_EMBED_SEND_DESCRIPTION: {};
    EMBED_DELETED_TITLE: {};
    EMBED_DELETED_DESCRIPTION: { embedName: any };
    MESSAGE_CREATED_TITLE: {};
    MESSAGE_CREATED_DESCRIPTION: { messageURL: any };
    NO_EMBEDS_TITLE: {};
    NO_EMBEDS_DESCRIPTION: {};
    EMBED_LIST_TITLE: { embedCount: any };
    MISSING_ARGUMENTS_TITLE: {};
    MISSING_ARGUMENTS_EMBED_OR_MESSAGE_DESCRIPTION: {};
    MESSAGE_TOO_BIG_TITLE: {};
    MESSAGE_TOO_BIG_DESCRIPTION: { overage: any };
    TAG_CREATED_TITLE: {};
    TAG_CREATED_DESCRIPTION: { tagName: any };
    INVALID_ARGUMENT_TAG_EMBED_DESCRIPTION: {};
    PREVIEW_TAG_BUTTON_LABEL: {};
    INVALID_ARGUMENT_TAG_TITLE: {};
    INVALID_ARGUMENT_TAG_DESCRIPTION: {};
    TAG_DELETED_TITLE: {};
    TAG_DELETED_DESCRIPTION: { tagName: any };
    NO_TAGS_TITLE: {};
    NO_TAGS_DESCRIPTION: {};
    TAGS_LIST_TITLE: { tagCount: any };
    WALLET_ADDED_TITLE: {};
    WALLET_ADDED_DESCRIPTION: { walletName: any };
    INVALID_ARGUMENT_WALLET_TITLE: {};
    INVALID_ARGUMENT_WALLET_DESCRIPTION: {};
    NO_WALLETS_TITLE: {};
    NO_WALLETS_DESCRIPTION: {};
    WALLETS_LIST_TITLE: { walletCount: any };
    WALLET_DELETED_TITLE: {};
    WALLET_DELETED_DESCRIPTION: { walletName: any };
    EARNINGS_CHANNEL_SET_TITLE: {};
    EARNINGS_CHANNEL_SET_DESCRIPTION: { channelMention: any };
    EARNINGS_CHANNEL_REMOVED_TITLE: {};
    EARNINGS_CHANNEL_REMOVED_DESCRIPTION: {};
    EARNINGS_CHANNEL_NOT_SET_TITLE: {};
    EARNINGS_CHANNEL_NOT_SET_DESCRIPTION: {};
    FAILED_TO_SEND_MESSAGE_TITLE: {};
    FAILED_TO_SEND_MESSAGE_DESCRIPTION: {
        channelMention: any;
        sendingReason: any;
        sendMessages: any;
    };
    FAILED_TO_FETCH_MESSAGE_TITLE: {};
    FAILED_TO_FETCH_MESSAGE_DESCRIPTION: {
        channelMention: any;
        fetchingReason: any;
        readMessages: any;
    };
    EARNING_MESSAGE_TITLE: { date: any };
    FAILED_TO_EDIT_MESSAGE_TITLE: {};
    FAILED_TO_EDIT_MESSAGE_DESCRIPTION: {
        channelMention: any;
        editReason: any;
        manageMessages: any;
    };
    EARNINGS_LOGGED_TITLE: {};
    EARNINGS_LOGGED_DESCRIPTION: {};
    EARNINGS_LOG_REMOVED_TITLE: {};
    EARNINGS_LOG_REMOVED_DESCRIPTION: {};
    EARNINGS_MESSAGE_DOES_NOT_EXIST_TITLE: {};
    EARNINGS_MESSAGE_DOES_NOT_EXIST_DESCRIPTION: {};
    WALLET_MESSAGE: { amount: any; address: any };
}
