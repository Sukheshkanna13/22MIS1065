import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  IconButton,
  Tooltip,
} from '@mui/material';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { Notification } from '../api/notifications';

const TYPE_COLORS: Record<string, 'success' | 'primary' | 'warning'> = {
  Placement: 'success',
  Result: 'primary',
  Event: 'warning',
};

interface Props {
  notification: Notification;
  isRead: boolean;
  onMarkRead: (id: string) => void;
  showScore?: boolean;
}

export function NotificationCard({ notification, isRead, onMarkRead, showScore }: Props): React.ReactElement {
  const color = TYPE_COLORS[notification.Type] ?? 'default';
  const ts = new Date(notification.Timestamp).toLocaleString();

  return (
    <Card
      variant="outlined"
      sx={{
        mb: 1.5,
        bgcolor: isRead ? 'background.paper' : 'action.selected',
        borderLeft: isRead ? undefined : '4px solid',
        borderLeftColor: isRead ? undefined : `${color}.main`,
        transition: 'background-color 0.2s',
      }}
    >
      <CardContent sx={{ pb: '12px !important' }}>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={1}>
          <Box flex={1}>
            <Box display="flex" alignItems="center" gap={1} mb={0.5} flexWrap="wrap">
              <Chip label={notification.Type} color={color} size="small" />
              {!isRead && (
                <Chip label="New" size="small" color="error" variant="outlined" />
              )}
              {showScore && notification.score !== undefined && (
                <Chip
                  label={`Score: ${notification.score.toFixed(3)}`}
                  size="small"
                  variant="outlined"
                  color="secondary"
                />
              )}
              {notification.rank !== undefined && (
                <Chip label={`#${notification.rank}`} size="small" variant="filled" />
              )}
            </Box>
            <Typography variant="body1" sx={{ fontWeight: isRead ? 400 : 600 }}>
              {notification.Message}
            </Typography>
            <Typography variant="caption" color="text.secondary" mt={0.5} display="block">
              {ts}
            </Typography>
          </Box>
          {!isRead && (
            <Tooltip title="Mark as read">
              <IconButton size="small" onClick={() => onMarkRead(notification.ID)} sx={{ mt: 0.5 }}>
                <DoneAllIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
