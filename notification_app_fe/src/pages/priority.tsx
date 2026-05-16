import React, { useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Skeleton,
  Alert,
  AppBar,
  Toolbar,
  Button,
  Stack,
  SelectChangeEvent,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import Link from 'next/link';
import { Log } from 'logging_middleware';
import { usePriorityNotifications } from '../hooks/useNotifications';
import { NotificationCard } from '../components/NotificationCard';
import { TypeFilter } from '../components/TypeFilter';

export default function PriorityPage(): React.ReactElement {
  const { notifications, loading, error, n, setN, typeFilter, setTypeFilter } = usePriorityNotifications(10);

  useEffect(() => {
    Log('frontend', 'info', 'page', 'PriorityPage mounted').catch(() => {});
  }, []);

  const handleNChange = (e: SelectChangeEvent<number>) => {
    Log('frontend', 'info', 'page', `Priority n changed to ${e.target.value}`).catch(() => {});
    setN(Number(e.target.value));
  };

  return (
    <Box minHeight="100vh" bgcolor="background.default">
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <NotificationsIcon sx={{ mr: 1 }} />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Campus Notifications
          </Typography>
          <Button color="inherit" component={Link} href="/">
            All Notifications
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h5" fontWeight={600} mb={3}>
          Priority Inbox
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} alignItems={{ sm: 'center' }} mb={3}>
          <TypeFilter value={typeFilter} onChange={setTypeFilter} />
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Top N</InputLabel>
            <Select<number> value={n} label="Top N" onChange={handleNChange}>
              <MenuItem value={10}>Top 10</MenuItem>
              <MenuItem value={15}>Top 15</MenuItem>
              <MenuItem value={20}>Top 20</MenuItem>
            </Select>
          </FormControl>
        </Stack>

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
              isRead={n.isRead === true}
              onMarkRead={() => {}}
              showScore
            />
          ))
        )}
      </Container>
    </Box>
  );
}
