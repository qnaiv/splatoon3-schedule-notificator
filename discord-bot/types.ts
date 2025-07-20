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
}

export interface UserSettings {
  userId: string;
  channelId: string;
  conditions: NotificationCondition[];
  lastNotified?: string;
}

export interface ScheduleMatch {
  id: string;
  start_time: string;
  end_time: string;
  rule: {
    name: string;
    id: string;
  };
  stages: Array<{
    name: string;
    id: string;
    image?: {
      url: string;
    };
  }>;
  match_type: string;
}

export interface ScheduleData {
  lastUpdated: string;
  source: string;
  data: {
    result: {
      regular: ScheduleMatch[];
      bankara_challenge?: ScheduleMatch[];
      bankara_open?: ScheduleMatch[];
      x?: ScheduleMatch[];
    };
  };
}

export interface NotificationMessage {
  condition: NotificationCondition;
  match: ScheduleMatch;
  minutesUntilStart: number;
}