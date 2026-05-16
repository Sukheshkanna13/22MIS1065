import { Router } from 'express';
import {
  getAllNotifications,
  getPriorityNotifications,
  markNotificationRead,
  getUnreadNotificationCount,
} from '../controllers/notificationController';

const router = Router();

router.get('/unread-count', getUnreadNotificationCount);
router.get('/priority', getPriorityNotifications);
router.get('/', getAllNotifications);
router.patch('/:id/read', markNotificationRead);

export default router;
