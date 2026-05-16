export type NotificationType = 'Event' | 'Result' | 'Placement';

export interface Notification {
  ID: string;
  Type: NotificationType;
  Message: string;
  Timestamp: string;
}

export interface ScoredNotification extends Notification {
  score: number;
  rank: number;
}

export interface ReadStatus {
  notificationId: string;
  isRead: boolean;
  readAt: string | null;
}
