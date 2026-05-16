# logging_middleware

Reusable TypeScript package that posts structured logs to the evaluation service API.

## Usage

```typescript
import { Log } from 'logging_middleware';

await Log('backend', 'info', 'service', 'Notification created successfully');
await Log('frontend', 'error', 'api', 'Failed to fetch notifications');
```

## Environment Variables

Create a `.env` file with:

```
LOG_EMAIL=your-email@example.com
LOG_NAME=Your Name
LOG_ROLL_NO=22MIS1065
LOG_ACCESS_CODE=SfFuWg
LOG_CLIENT_ID=<clientID from registration>
LOG_CLIENT_SECRET=<clientSecret from registration>
```

## API

### `Log(stack, level, package, message): Promise<void>`

| Parameter | Type | Values |
|-----------|------|--------|
| stack | string | `"backend"` \| `"frontend"` |
| level | string | `"debug"` \| `"info"` \| `"warn"` \| `"error"` \| `"fatal"` |
| package | string | See below |
| message | string | Any string describing the event |

**Backend packages:** `cache`, `controller`, `cron_job`, `db`, `domain`, `handler`, `repository`, `route`, `service`

**Frontend packages:** `api`, `component`, `hook`, `page`, `state`, `style`

**Shared packages:** `auth`, `config`, `middleware`, `utils`

## Features

- Automatic token refresh when JWT expires
- Single retry on failure before writing to stderr
- No `console.log` — uses `process.stderr` only for unrecoverable errors
- Reads credentials from environment variables via `dotenv`
