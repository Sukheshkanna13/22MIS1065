import { Log } from 'logging_middleware';
import { Notification, ScoredNotification } from '../domain/notification';

const TYPE_WEIGHT: Record<string, number> = {
  Placement: 3,
  Result: 2,
  Event: 1,
};

function computeScore(notification: Notification): number {
  const weight = TYPE_WEIGHT[notification.Type] ?? 1;
  const createdAt = new Date(notification.Timestamp).getTime();
  const minutesAgo = (Date.now() - createdAt) / 60000;
  const recencyBoost = 1 / (1 + minutesAgo);
  return weight * recencyBoost;
}

class MinHeap {
  private heap: ScoredNotification[] = [];

  get size(): number {
    return this.heap.length;
  }

  peek(): ScoredNotification | undefined {
    return this.heap[0];
  }

  private swap(i: number, j: number): void {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
  }

  private siftUp(i: number): void {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.heap[parent].score > this.heap[i].score) {
        this.swap(parent, i);
        i = parent;
      } else {
        break;
      }
    }
  }

  private siftDown(i: number): void {
    const n = this.heap.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      if (l < n && this.heap[l].score < this.heap[smallest].score) smallest = l;
      if (r < n && this.heap[r].score < this.heap[smallest].score) smallest = r;
      if (smallest !== i) {
        this.swap(i, smallest);
        i = smallest;
      } else {
        break;
      }
    }
  }

  push(item: ScoredNotification): void {
    this.heap.push(item);
    this.siftUp(this.heap.length - 1);
  }

  pop(): ScoredNotification | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.siftDown(0);
    }
    return top;
  }
}

export async function getTopNPriorityNotifications(
  notifications: Notification[],
  n: number = 10
): Promise<ScoredNotification[]> {
  await Log('backend', 'info', 'service', `Computing top ${n} priority notifications from ${notifications.length} total`);

  const heap = new MinHeap();

  for (const notification of notifications) {
    const score = computeScore(notification);
    const scored: ScoredNotification = { ...notification, score, rank: 0 };

    if (heap.size < n) {
      heap.push(scored);
    } else if (heap.peek() && score > heap.peek()!.score) {
      heap.pop();
      heap.push(scored);
    }
  }

  const result: ScoredNotification[] = [];
  while (heap.size > 0) {
    const item = heap.pop();
    if (item) result.unshift(item);
  }

  const ranked = result.map((item, idx) => ({ ...item, rank: idx + 1 }));

  await Log('backend', 'info', 'service', `Priority inbox computed: top ${ranked.length} notifications returned`);
  return ranked;
}
