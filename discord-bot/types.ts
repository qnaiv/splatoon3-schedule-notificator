// Discord Bot用の型定義

export interface BotSettings {
  conditions: NotificationCondition[];
}

export interface NotificationCondition {
  name: string;
  rules: string[];
  matchTypes: string[];
  stages: string[];
  notifyMinutesBefore: number;
  enabled: boolean;
  lastNotified?: string; // この条件で最後に通知した時刻
}

export interface UserSettings {
  userId: string;
  channelId: string;
  conditions: NotificationCondition[];
  lastNotified?: string;
}

export interface Stage {
  name: string;
  id: string;
  image?: {
    url: string;
  };
}

export interface ApiMatch {
  start_time: string;
  end_time: string;
  rule: {
    name: string;
    id: string;
  };
  stages: Stage[];
}

export interface ScheduleMatch extends ApiMatch {
  match_type: string;
}

export interface ScheduleData {
  lastUpdated: string;
  source: string;
  data: {
    result: {
      regular: ApiMatch[];
      bankara_challenge?: ApiMatch[];
      bankara_open?: ApiMatch[];
      x?: ApiMatch[];
    };
  };
}

export interface NotificationMessage {
  condition: NotificationCondition;
  match: ScheduleMatch;
  minutesUntilStart: number;
}

export interface InteractionOption {
  name: string;
  value: string;
  type: number;
}

export interface DiscordInteraction {
  type: number;
  id: string;
  token: string;
  data: {
    name: string;
    options?: InteractionOption[];
  };
  member?: {
    user?: {
      id: string;
    };
  };
  user?: {
    id: string;
  };
  channel_id: string;
  guild_id?: string;
}

export interface Embed {
  title?: string;
  description?: string;
  color?: number;
  timestamp?: string;
  footer?: {
    text: string;
  };
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
}
