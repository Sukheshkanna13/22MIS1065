import { Request, Response, NextFunction } from 'express';
import { Log } from 'logging_middleware';
import { fetchAllNotifications, markAsRead, getUnreadCount } from '../services/notificationService';
import { getTopNPriorityNotifications } from '../services/priorityInbox';

export async function getAllNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await Log('backend', 'info', 'controller', 'getAllNotifications invoked');
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const notification_type = req.query.notification_type as string | undefined;

    const data = await fetchAllNotifications({ limit, page, notification_type });
    res.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await Log('backend', 'error', 'controller', `getAllNotifications failed: ${msg}`);
    next(err);
  }
}

export async function getPriorityNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const n = req.query.n ? parseInt(req.query.n as string, 10) : 10;
    await Log('backend', 'info', 'controller', `getPriorityNotifications invoked, n=${n}`);

    const data = await fetchAllNotifications({ limit: 10, page: 1 });
    const prioritized = await getTopNPriorityNotifications(data.notifications, n);
    res.json({ notifications: prioritized });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await Log('backend', 'error', 'controller', `getPriorityNotifications failed: ${msg}`);
    next(err);
  }
}

export async function markNotificationRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    await Log('backend', 'info', 'controller', `markNotificationRead invoked for id=${id}`);

    const status = await markAsRead(id);
    res.json(status);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await Log('backend', 'error', 'controller', `markNotificationRead failed: ${msg}`);
    next(err);
  }
}

export async function getUnreadNotificationCount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await Log('backend', 'info', 'controller', 'getUnreadNotificationCount invoked');
    const data = await fetchAllNotifications({ limit: 10, page: 1 });
    const count = await getUnreadCount(data.notifications);
    res.json({ unreadCount: count });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await Log('backend', 'error', 'controller', `getUnreadNotificationCount failed: ${msg}`);
    next(err);
  }
}
