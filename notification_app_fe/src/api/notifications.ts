import { Log } from 'logging_middleware';

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export interface Notification {
  ID: string;
  Type: 'Event' | 'Result' | 'Placement';
  Message: string;
  Timestamp: string;
  isRead?: boolean;
  score?: number;
  rank?: number;
}

export interface FetchNotificationsResult {
  notifications: Notification[];
  total?: number;
}

export async function fetchNotifications(params?: {
  limit?: number;
  page?: number;
  notification_type?: string;
}): Promise<FetchNotificationsResult> {
  await Log('frontend', 'info', 'api', `Fetching notifications with params: ${JSON.stringify(params)}`);

  const query = new URLSearchParams();
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.page) query.set('page', String(params.page));
  if (params?.notification_type) query.set('notification_type', params.notification_type);

  try {
    const res = await fetch(`${BASE_URL}/api/notifications?${query}`);
    if (!res.ok) {
      await Log('frontend', 'error', 'api', `Notifications fetch failed: ${res.status}`);
      throw new Error(`HTTP ${res.status}`);
    }
    const data: FetchNotificationsResult = await res.json();
    await Log('frontend', 'debug', 'api', `Fetched ${data.notifications?.length ?? 0} notifications`);
    return data;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await Log('frontend', 'fatal', 'api', `Notifications API unreachable: ${msg}`);
    throw err;
  }
}

export async function fetchPriorityNotifications(n: number = 10): Promise<FetchNotificationsResult> {
  await Log('frontend', 'info', 'api', `Fetching priority notifications, n=${n}`);

  try {
    const res = await fetch(`${BASE_URL}/api/notifications/priority?n=${n}`);
    if (!res.ok) {
      await Log('frontend', 'error', 'api', `Priority notifications fetch failed: ${res.status}`);
      throw new Error(`HTTP ${res.status}`);
    }
    const data: FetchNotificationsResult = await res.json();
    await Log('frontend', 'debug', 'api', `Fetched ${data.notifications?.length ?? 0} priority notifications`);
    return data;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await Log('frontend', 'fatal', 'api', `Priority notifications API unreachable: ${msg}`);
    throw err;
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  await Log('frontend', 'info', 'api', `Marking notification ${id} as read`);

  try {
    const res = await fetch(`${BASE_URL}/api/notifications/${id}/read`, { method: 'PATCH' });
    if (!res.ok) {
      await Log('frontend', 'warn', 'api', `Mark read failed for ${id}: ${res.status}`);
    } else {
      await Log('frontend', 'debug', 'api', `Notification ${id} marked as read`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await Log('frontend', 'error', 'api', `Mark read request failed: ${msg}`);
  }
}

export async function fetchUnreadCount(): Promise<number> {
  await Log('frontend', 'debug', 'api', 'Fetching unread count');

  try {
    const res = await fetch(`${BASE_URL}/api/notifications/unread-count`);
    if (!res.ok) return 0;
    const data: { unreadCount: number } = await res.json();
    return data.unreadCount;
  } catch {
    return 0;
  }
}
