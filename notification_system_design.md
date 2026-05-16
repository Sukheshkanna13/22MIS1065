# Notification System Design

---

# Stage 1

## REST API Design — Campus Notification Platform

### Base URL

```
https://api.campus-notify.internal/v1
```

All endpoints require `Authorization: Bearer <token>` in the request header.

---

### Endpoints

#### `GET /notifications`

Fetch all notifications for the authenticated student.

**Request Headers**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Query Parameters**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| limit | integer | No | Number of results per page (default: 20) |
| page | integer | No | Page number (default: 1) |
| notification_type | string | No | Filter by type: `Event`, `Result`, `Placement` |

**Success Response — 200**
```json
{
  "notifications": [
    {
      "id": "6bb65d57-2e8e-46a7-a0a8-6872029c4dfa",
      "type": "Placement",
      "message": "PayPal Holdings Inc. hiring",
      "isRead": false,
      "createdAt": "2026-05-16T00:27:58Z"
    }
  ],
  "total": 120,
  "page": 1,
  "limit": 20
}
```

**Error Responses**
- `400 Bad Request` — Invalid query parameter type
- `401 Unauthorized` — Missing or expired Bearer token
- `500 Internal Server Error` — Database or upstream failure

---

#### `GET /notifications/:id`

Fetch a single notification by its UUID.

**Request Headers**
```
Authorization: Bearer <token>
```

**Path Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | UUID string | Notification ID |

**Success Response — 200**
```json
{
  "id": "6bb65d57-2e8e-46a7-a0a8-6872029c4dfa",
  "type": "Placement",
  "message": "PayPal Holdings Inc. hiring",
  "isRead": true,
  "readAt": "2026-05-16T01:00:00Z",
  "createdAt": "2026-05-16T00:27:58Z",
  "metadata": {}
}
```

**Error Responses**
- `401 Unauthorized` — Missing or expired token
- `404 Not Found` — No notification with that ID for the current student
- `500 Internal Server Error`

---

#### `PATCH /notifications/:id/read`

Mark a single notification as read.

**Request Headers**
```
Authorization: Bearer <token>
```

**Path Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | UUID string | Notification ID |

**Request Body** — none required

**Success Response — 200**
```json
{
  "id": "6bb65d57-2e8e-46a7-a0a8-6872029c4dfa",
  "isRead": true,
  "readAt": "2026-05-16T01:05:22Z"
}
```

**Error Responses**
- `400 Bad Request` — Notification already marked as read
- `401 Unauthorized`
- `404 Not Found`
- `500 Internal Server Error`

---

#### `PATCH /notifications/read-all`

Mark all notifications for the authenticated student as read.

**Request Headers**
```
Authorization: Bearer <token>
```

**Request Body** — none required

**Success Response — 200**
```json
{
  "updated": 47,
  "message": "All notifications marked as read"
}
```

**Error Responses**
- `401 Unauthorized`
- `500 Internal Server Error`

---

#### `GET /notifications/unread-count`

Get the count of unread notifications for the authenticated student.

**Request Headers**
```
Authorization: Bearer <token>
```

**Success Response — 200**
```json
{
  "unreadCount": 12
}
```

**Error Responses**
- `401 Unauthorized`
- `500 Internal Server Error`

---

#### `POST /notifications`

Admin endpoint — create a new notification and fan it out to target students.

**Request Headers**
```
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Request Body**
```json
{
  "type": "Placement",
  "message": "Google SWE interviews on campus next week",
  "studentIds": ["22MIS1065", "22MIS1066"],
  "metadata": {
    "company": "Google",
    "date": "2026-05-22"
  }
}
```

| Field | Type | Required | Values |
|-------|------|----------|--------|
| type | string | Yes | `Event`, `Result`, `Placement` |
| message | string | Yes | Notification text |
| studentIds | string[] | Yes | Target roll numbers; use `["ALL"]` for broadcast |
| metadata | object | No | Arbitrary JSON payload |

**Success Response — 201**
```json
{
  "id": "new-uuid",
  "type": "Placement",
  "message": "Google SWE interviews on campus next week",
  "recipientCount": 2,
  "createdAt": "2026-05-16T10:00:00Z"
}
```

**Error Responses**
- `400 Bad Request` — Invalid type value or missing required fields
- `401 Unauthorized`
- `403 Forbidden` — Non-admin token
- `500 Internal Server Error`

---

#### `GET /notifications/priority`

Return the top-N priority notifications using a weighted recency algorithm.

**Request Headers**
```
Authorization: Bearer <token>
```

**Query Parameters**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| n | integer | No | How many to return (default: 10, max: 50) |

**Success Response — 200**
```json
{
  "notifications": [
    {
      "id": "6bb65d57-2e8e-46a7-a0a8-6872029c4dfa",
      "type": "Placement",
      "message": "PayPal Holdings Inc. hiring",
      "score": 2.94,
      "rank": 1,
      "createdAt": "2026-05-16T00:27:58Z"
    }
  ]
}
```

**Error Responses**
- `400 Bad Request` — n is not a positive integer
- `401 Unauthorized`
- `500 Internal Server Error`

---

### Real-Time Notification System (WebSocket)

#### Connection Lifecycle

1. **Connect** — client opens a WebSocket connection to `wss://api.campus-notify.internal/ws`
2. **Authenticate** — client sends an `auth` frame immediately after connect:
   ```json
   { "event": "auth", "data": { "token": "<Bearer JWT>" } }
   ```
3. **Server acknowledges**:
   ```json
   { "event": "auth_ok", "data": { "studentId": "22MIS1065" } }
   ```
   If the token is invalid, the server sends `{ "event": "auth_error" }` and closes the connection.
4. **Receive events** — after authentication, the server pushes events when new notifications arrive:
   ```json
   {
     "event": "new_notification",
     "data": {
       "ID": "6bb65d57-2e8e-46a7-a0a8-6872029c4dfa",
       "Type": "Placement",
       "Message": "PayPal Holdings Inc. hiring",
       "Timestamp": "2026-05-16T00:27:58Z"
     }
   }
   ```
5. **Heartbeat** — server sends `{ "event": "ping" }` every 30 seconds; client must respond `{ "event": "pong" }` or the connection is dropped.
6. **Disconnect** — client closes or heartbeat times out; server removes the connection from the active-connection map.

#### Server-Side Fan-Out

The server maintains a map of `studentId → WebSocket[]`. When a new notification is created via `POST /notifications`, the service iterates the target student IDs and writes to each active connection. If a student has multiple browser tabs open, all connections receive the push.

#### Fallback to Polling

If the browser does not support WebSocket, or if the WebSocket connection fails three times in a row, the frontend falls back to polling `GET /notifications?limit=20` every 30 seconds using `setInterval`. The frontend uses the `lastFetchedAt` timestamp to detect new notifications and appends them to the top of the list.

---

# Stage 2

## Database Design

### DB Choice: PostgreSQL

**Justification:**
- ACID-compliant transactions guarantee that a notification insertion and its student fan-out records are atomic — no partial delivery.
- JSONB support allows flexible `metadata` storage (company name, event URL, etc.) without schema migrations for every new notification type.
- Mature B-tree and GIN indexing enables sub-millisecond lookups on UUID primary keys and full-text search on message content.
- Row-level security policies can enforce that students can only SELECT rows where their `student_id` matches, preventing data leakage at the DB layer.
- Proven at scale: supports partitioning (range/list) for archiving old notifications without application changes.

---

### Schema

```sql
CREATE TABLE students (
  id SERIAL PRIMARY KEY,
  student_id VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TYPE notification_type AS ENUM ('Event', 'Result', 'Placement');

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type notification_type NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB
);

CREATE TABLE student_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, notification_id)
);

CREATE INDEX idx_student_notifications_student_id ON student_notifications(student_id);
CREATE INDEX idx_student_notifications_unread ON student_notifications(student_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
```

---

### Queries for Stage 2 APIs

**Fetch all notifications for a student (paginated)**
```sql
SELECT
  n.id,
  n.type,
  n.message,
  n.created_at,
  sn.is_read,
  sn.read_at
FROM student_notifications sn
JOIN notifications n ON sn.notification_id = n.id
WHERE sn.student_id = $1
ORDER BY n.created_at DESC
LIMIT $2 OFFSET $3;
```

**Mark single notification as read**
```sql
UPDATE student_notifications
SET is_read = TRUE, read_at = NOW()
WHERE student_id = $1
  AND notification_id = $2
  AND is_read = FALSE
RETURNING notification_id, read_at;
```

**Mark all notifications as read**
```sql
UPDATE student_notifications
SET is_read = TRUE, read_at = NOW()
WHERE student_id = $1
  AND is_read = FALSE;
```

**Unread count**
```sql
SELECT COUNT(*) AS unread_count
FROM student_notifications
WHERE student_id = $1
  AND is_read = FALSE;
```

**Create notification (single insert + bulk fan-out)**
```sql
-- Step 1: Insert notification
INSERT INTO notifications (type, message, metadata)
VALUES ($1, $2, $3)
RETURNING id;

-- Step 2: Fan-out to target students (batch insert)
INSERT INTO student_notifications (student_id, notification_id)
SELECT s.id, $1
FROM students s
WHERE s.student_id = ANY($2::text[]);
```

**Priority fetch (top-N by weighted recency — computed in application layer)**
```sql
SELECT n.id, n.type, n.message, n.created_at
FROM student_notifications sn
JOIN notifications n ON sn.notification_id = n.id
WHERE sn.student_id = $1
ORDER BY n.created_at DESC
LIMIT 100;
```

The priority score `weight * (1 / (1 + minutesSinceCreation))` is computed in the application layer using the min-heap algorithm (see Stage 6).

---

### Scale Problems and Solutions

**Problem at 5M+ rows:**
- Full-table scans on `student_notifications` when indexes become bloated from frequent updates to `is_read`
- Large JSONB `metadata` columns increase row size and slow sequential scans
- Cross-table JOINs between `student_notifications` (5M rows) and `notifications` degrade under concurrent load

**Solutions:**

1. **Range partitioning on `notifications.created_at`** (monthly partitions):
   ```sql
   CREATE TABLE notifications_2026_05 PARTITION OF notifications
   FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
   ```
   The query planner prunes irrelevant partitions automatically.

2. **Archive cold notifications** to a separate `notifications_archive` table after 6 months via a nightly `cron_job`. Index only `notifications` (hot partition); archive table can be stored on cheaper storage.

3. **Connection pooling with PgBouncer** in transaction mode — limits DB connections to ~100 while serving thousands of concurrent API requests.

4. **Partial indexes** on `is_read = FALSE` reduce index size since most notifications eventually get read.

5. **JSONB GIN index** for metadata queries:
   ```sql
   CREATE INDEX idx_notifications_metadata ON notifications USING GIN (metadata);
   ```

---

# Stage 3

## Query Optimization

### Analyzing the Original Query

```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt ASC;
```

**Accuracy issue:** The query is incorrect. There is no `studentID` or `isRead` column on the `notifications` table — those columns live on the junction table `student_notifications`. Running this query would return a `column does not exist` error.

**Corrected query:**
```sql
SELECT n.id, n.type, n.message, n.created_at
FROM student_notifications sn
JOIN notifications n ON sn.notification_id = n.id
WHERE sn.student_id = 1042
  AND sn.is_read = FALSE
ORDER BY n.created_at ASC;
```

---

### Why the Original Was Slow (Even If Fixed)

1. **No composite index on `(student_id, is_read)`** — the DB performs a sequential scan of `student_notifications`, reading every row to find those matching `student_id = 1042 AND is_read = FALSE`. At 5M rows that is O(n).
2. **`SELECT *`** — fetches all columns including the large JSONB `metadata` field, which increases I/O and memory pressure unnecessarily.
3. **No partial index on `is_read = FALSE`** — since `is_read` has very low cardinality (boolean), a plain index on it is ineffective. A partial index targeting only unread rows is much smaller and faster.

---

### Optimal Index

```sql
CREATE INDEX idx_sn_student_unread
  ON student_notifications(student_id, is_read, notification_id)
  WHERE is_read = FALSE;
```

With this index, the planner performs an index range scan scoped to `student_id = 1042` within the partial index — reading only rows where `is_read = FALSE`. The `notification_id` is included so the JOIN can be resolved from the index alone (index-only scan), avoiding a heap fetch.

**Computation cost before fix:** O(n) — sequential scan over all 5M rows in `student_notifications`.

**After fix:** O(log n + k) — B-tree index lookup in O(log n), then k matching rows read, where k is the unread count for that student (typically < 100).

---

### Why Adding Indexes on Every Column Is a Bad Idea

- **Write amplification:** every INSERT or UPDATE to `student_notifications` must update all indexes. With 5 indexes, a single insert performs 5 B-tree insert operations — 5× write overhead.
- **Storage bloat:** each index is a separate B-tree on disk. Indexing all columns of a wide table can double or triple storage requirements.
- **Query planner confusion:** PostgreSQL's planner uses statistics to choose an index. Presenting it with 10 candidate indexes for a single query can lead to suboptimal plan selection, especially when index statistics are stale.
- **Low-cardinality problem:** a plain index on a boolean column like `is_read` has poor selectivity — roughly 50% of rows match either value, so a seq scan is often cheaper than an index scan. Only a partial index (filtering one value) is useful here.

---

### Students with Placement Notifications in the Last 7 Days

```sql
SELECT DISTINCT s.student_id, s.email, s.name
FROM students s
JOIN student_notifications sn ON s.id = sn.student_id
JOIN notifications n ON sn.notification_id = n.id
WHERE n.type = 'Placement'
  AND n.created_at >= NOW() - INTERVAL '7 days';
```

This query benefits from `idx_notifications_type` and `idx_notifications_created_at` working together. The planner can use a bitmap index scan combining both indexes for the filter, then hash-join to `student_notifications` and `students`.

---

# Stage 4

## Caching Strategy

### Problem

Every page load triggers a DB query for each student's notification list. At 50,000 concurrent students, this is 50,000 queries per page load — a direct path to DB saturation.

---

### Solution 1: Redis Cache (Primary Recommendation)

Cache the notification list per student with a short TTL:

```
Key:   notifications:{student_id}
Value: JSON-serialized array of notifications
TTL:   30 seconds (configurable)
```

**Read path (cache-aside):**
1. Check Redis for `notifications:{student_id}`
2. Cache hit → return cached data; cache miss → query DB, write result to Redis, return data

**Write path (cache invalidation):**
- On `PATCH /notifications/:id/read` → `DEL notifications:{student_id}`
- On `POST /notifications` (new notification) → `DEL notifications:{student_id}` for each target student (or use pub/sub to invalidate asynchronously)

**Tradeoffs:**
- Staleness: students may see data up to TTL seconds old — acceptable for notifications
- Extra infrastructure: Redis adds operational complexity and cost
- Cache invalidation: must be kept in sync with write operations; bugs here cause stale reads

---

### Solution 2: HTTP Cache-Control Headers

For read endpoints, set:
```
Cache-Control: private, max-age=30, stale-while-revalidate=60
```

**Tradeoffs:**
- Works only at the browser/CDN layer for identical requests — does not reduce DB load across different clients
- `private` directive prevents CDN caching of per-student data, limiting benefit to browser-only

---

### Solution 3: Cursor-Based Pagination

Never fetch all notifications in one query:
```
GET /notifications?limit=20&cursor=<last_seen_id>
```

**Tradeoffs:**
- Dramatically reduces rows scanned per request (from potentially thousands to 20)
- Requires frontend state management for the cursor
- Cannot support arbitrary page jumps (go to page 10) without offset-based fallback

---

### Solution 4: Read-Through Cache with Background Refresh

On cache miss, serve the previous (stale) cached value immediately and refresh asynchronously:

1. Return stale cache immediately → zero latency for user
2. Background job fetches from DB → updates cache

**Tradeoffs:**
- Users may see notification counts that are 30–60 seconds behind reality
- Requires a background worker process and more complex cache management

---

### Recommended Architecture

**Redis + Pagination + WebSocket push:**
- WebSocket delivers new notifications in real time → no polling, zero DB reads for real-time updates
- Redis caches the initial page load → near-zero DB reads for returning users
- Cursor-based pagination limits each query to 20 rows maximum
- Result: DB load is limited to cache misses only (~1 query per 30-second TTL per student)

---

# Stage 5

## Bulk Notification Redesign

### Shortcomings of the Original Implementation

```
function notify_all(student_ids: array, message: string):
  for student_id in student_ids:
    send_email(student_id, message)
    save_to_db(student_id, message)
    push_to_app(student_id, message)
```

1. **Sequential loop** — iterating 50,000 students one-by-one in a single thread takes hours. Each `send_email` call may take 200ms, making the total time ~2.7 hours for 50,000 students.
2. **No retry mechanism** — if `send_email` fails at student 25,000, the remaining 25,000 receive nothing, and there is no way to resume.
3. **DB writes inside the loop** — 50,000 individual INSERT statements instead of a single bulk insert. Each INSERT acquires and releases a lock, generating enormous write overhead.
4. **Blocking operation** — the HTTP request that triggered `notify_all` hangs for the entire duration, timing out and returning a 504 to the caller.
5. **No idempotency** — if the process crashes and restarts, re-running sends duplicate emails to students who already received them.
6. **Tight coupling** — email delivery failure blocks the DB save, meaning a transient email API outage causes no notifications to be saved to the database at all.

---

### Redesigned Architecture

```typescript
async function notify_all(student_ids: string[], message: string): Promise<void> {
  // 1. Single DB insert for the notification record
  const notificationId = await save_notification_to_db(message);
  await Log('backend', 'info', 'service', `Notification ${notificationId} created for ${student_ids.length} students`);

  // 2. Bulk insert all student_notification rows in one query
  await bulk_insert_student_notifications(student_ids, notificationId);

  // 3. Enqueue email jobs in batches of 500 to the message queue
  const batches = chunk(student_ids, 500);
  for (const batch of batches) {
    await messageQueue.publish('email_notifications', {
      notificationId,
      studentIds: batch,
      message,
      retryCount: 0,
    });
  }

  // 4. Push real-time via WebSocket (non-blocking fire-and-forget)
  websocketServer.broadcastToStudents(student_ids, {
    event: 'new_notification',
    data: { id: notificationId, message },
  });
}

// Worker process (separate service, horizontally scalable)
async function emailWorker(job: EmailJob): Promise<void> {
  try {
    await send_email(job.studentId, job.message);
    await Log('backend', 'info', 'service', `Email sent to ${job.studentId}`);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    if (job.retryCount < 3) {
      await messageQueue.publish('email_notifications', { ...job, retryCount: job.retryCount + 1 });
      await Log('backend', 'warn', 'service', `Email retry ${job.retryCount + 1} for ${job.studentId}`);
    } else {
      await Log('backend', 'error', 'service', `Email permanently failed for ${job.studentId}: ${errMsg}`);
      await mark_email_failed(job.studentId, job.notificationId);
    }
  }
}
```

**Why DB save and email must be decoupled:**
The database record is the source of truth for notification delivery. Email is a delivery side effect. Coupling them means any transient email API failure (rate limit, network blip) would roll back a valid database record — the student would receive the email eventually via retry, but the notification would not appear in their inbox because it was never saved. Decoupling guarantees the DB record exists regardless of email delivery status, enabling the frontend to display the notification immediately even if the email is still queued.

**Message queue guarantees used:**
- At-least-once delivery: if a worker crashes mid-batch, the queue redelivers the unacknowledged messages
- Idempotency: the `notificationId` in each job allows the worker to check if an email was already sent (via a sent-log table) before sending again on re-delivery

---

# Stage 6

## Priority Inbox Algorithm

### Design

Each notification is scored using two factors:

1. **Type weight** — reflects business priority:
   - Placement = 3 (high urgency, career impact)
   - Result = 2 (medium urgency, academic impact)
   - Event = 1 (low urgency, informational)

2. **Recency boost** — newer notifications score higher:
   ```
   recencyBoost = 1 / (1 + minutesSinceCreation)
   ```
   A notification created right now has boost ≈ 1.0. One created 10 minutes ago has boost ≈ 0.09.

3. **Combined score:**
   ```
   score = typeWeight * recencyBoost
   ```

### Why a Min-Heap for Top-N

A naive approach sorts all notifications by score (O(n log n)) and takes the first N. With 10,000 notifications per student, this is wasteful when we only need 10.

A min-heap of size N achieves O(n log N):
- Maintain a heap of the N highest-scored notifications seen so far
- For each new notification, compute score in O(1)
- If score > heap minimum → pop the minimum, push the new item (O(log N))
- Final extraction is O(N log N) but N is small (≤ 50)

For n = 10,000 and N = 10: heap approach does ~130,000 operations vs ~230,000 for full sort.

### Maintaining Top-10 as New Notifications Arrive

When a new notification arrives via WebSocket:
1. Compute its score in O(1)
2. If heap size < N → push directly
3. If score > heap minimum → pop minimum, push new notification
4. Re-render only the changed entries (React key-based reconciliation handles this efficiently)

This keeps the priority inbox current in O(log N) per incoming event with no full re-sort.

### Implementation

The full TypeScript implementation lives in `notification_app_be/src/services/priorityInbox.ts`. It exports `getTopNPriorityNotifications(notifications, n)` which accepts a flat notification array and returns the top-N scored results sorted descending by score.
