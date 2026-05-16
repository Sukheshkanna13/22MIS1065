import React, { useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  Badge,
  Pagination,
  Skeleton,
  Alert,
  AppBar,
  Toolbar,
  Button,
  Stack,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import Link from 'next/link';
import { Log } from 'logging_middleware';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationCard } from '../components/NotificationCard';
import { TypeFilter } from '../components/TypeFilter';
import { Notification } from '../api/notifications';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export default function HomePage(): React.ReactElement {
  const {
    notifications,
    loading,
    error,
    page,
    setPage,
    typeFilter,
    setTypeFilter,
    unreadCount,
    readIds,
    markRead,
    addNotification,
  } = useNotifications(20);

  const wsRef = useRef<WebSocket | null>(null);
  const retryCountRef = useRef(0);

  useEffect(() => {
    Log('frontend', 'info', 'page', 'HomePage mounted').catch(() => {});

    function connect() {
      const wsUrl = BACKEND_URL.replace(/^http/, 'ws') + '/ws';
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        retryCountRef.current = 0;
        Log('frontend', 'info', 'page', 'WebSocket connected').catch(() => {});
      };

      ws.onmessage = (evt) => {
        try {
          const msg: { event: string; data: Notification } = JSON.parse(evt.data);
          if (msg.event === 'new_notification') {
            addNotification(msg.data);
          }
        } catch {
          // ignore malformed frames
        }
      };

      ws.onerror = () => {
        Log('frontend', 'warn', 'page', 'WebSocket error — will retry').catch(() => {});
      };

      ws.onclose = () => {
        if (retryCountRef.current < 3) {
          retryCountRef.current++;
          setTimeout(connect, 3000);
        } else {
          Log('frontend', 'warn', 'page', 'WebSocket unavailable after 3 retries — falling back to polling').catch(() => {});
        }
      };
    }

    connect();

    return () => {
      wsRef.current?.close();
    };
  }, [addNotification]);

  return (
    <Box minHeight="100vh" bgcolor="background.default">
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <NotificationsIcon sx={{ mr: 1 }} />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Campus Notifications
          </Typography>
          <Badge badgeContent={unreadCount} color="error" sx={{ mr: 2 }}>
            <NotificationsIcon />
          </Badge>
          <Button color="inherit" component={Link} href="/priority">
            Priority Inbox
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} mb={2} gap={1}>
          <Typography variant="h5" fontWeight={600}>
            All Notifications
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {unreadCount} unread
          </Typography>
        </Stack>

        <TypeFilter value={typeFilter} onChange={(v) => { setTypeFilter(v); setPage(1); }} />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Stack spacing={1.5}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={88} />
            ))}
          </Stack>
        ) : notifications.length === 0 ? (
          <Box py={8} textAlign="center">
            <Typography color="text.secondary">No notifications found.</Typography>
          </Box>
        ) : (
          notifications.map((n) => (
            <NotificationCard
              key={n.ID}
              notification={n}
              isRead={n.isRead === true || readIds.has(n.ID)}
              onMarkRead={markRead}
            />
          ))
        )}

        {!loading && notifications.length > 0 && (
          <Box display="flex" justifyContent="center" mt={3}>
            <Pagination
              count={10}
              page={page}
              onChange={(_e, v) => setPage(v)}
              color="primary"
            />
          </Box>
        )}
      </Container>
    </Box>
  );
}
