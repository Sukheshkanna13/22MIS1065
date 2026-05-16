import { Log } from 'logging_middleware';
import { config } from '../config/env';
import { Notification, ReadStatus } from '../domain/notification';

const readStore = new Map<string, ReadStatus>();

async function getBearerToken(): Promise<string> {
  if (config.bearerToken) return config.bearerToken;

  const res = await fetch(`${config.evalBaseUrl}/evaluation-service/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: config.logEmail,
      name: config.logName,
      rollNo: config.logRollNo,
      accessCode: config.logAccessCode,
      clientID: config.logClientId,
      clientSecret: config.logClientSecret,
    }),
  });

  if (!res.ok) {
    throw new Error(`Auth failed: ${res.status}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export async function fetchAllNotifications(params: {
  limit?: number;
  page?: number;
  notification_type?: string;
}): Promise<{ notifications: Notification[]; total?: number }> {
  const cappedLimit = Math.min(params.limit ?? 10, 10);
  await Log('backend', 'debug', 'service', `Fetching notifications from upstream, page=${params.page}, limit=${cappedLimit}`);

  const token = await getBearerToken();
  const query = new URLSearchParams();
  query.set('limit', String(cappedLimit));
  if (params.page) query.set('page', String(params.page));
  if (params.notification_type) query.set('notification_type', params.notification_type);

  const res = await fetch(`${config.evalBaseUrl}/evaluation-service/notifications?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    await Log('backend', 'error', 'service', `Upstream notifications fetch failed: ${res.status}`);
    throw new Error(`Upstream error: ${res.status}`);
  }

  const data = (await res.json()) as { notifications: Notification[] };

  data.notifications = data.notifications.map((n) => ({
    ...n,
    isRead: readStore.has(n.ID) ? readStore.get(n.ID)!.isRead : false,
  }));

  await Log('backend', 'debug', 'service', `Fetched ${data.notifications.length} notifications from upstream`);
  return data;
}

export async function markAsRead(notificationId: string): Promise<ReadStatus> {
  await Log('backend', 'info', 'service', `Marking notification ${notificationId} as read`);

  const status: ReadStatus = {
    notificationId,
    isRead: true,
    readAt: new Date().toISOString(),
  };
  readStore.set(notificationId, status);
  return status;
}

export async function getUnreadCount(allNotifications: Notification[]): Promise<number> {
  const count = allNotifications.filter((n) => !readStore.has(n.ID) || !readStore.get(n.ID)!.isRead).length;
  await Log('backend', 'debug', 'service', `Unread count: ${count}`);
  return count;
}
