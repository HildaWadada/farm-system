"use client";

/**
 * Local-first queue for anything the supervisor submits while offline.
 * When a submission fails due to no connection, it's saved here instead of
 * being lost — then automatically retried the moment the browser comes back
 * online (see useOfflineSync.ts).
 */

export type QueueKind = "activity" | "worker" | "buyer" | "order" | "purchase" | "vendor";

export type QueuedItem = {
  id: string;
  kind: QueueKind;
  payload: any;
  createdAt: string;
};

const STORAGE_KEY = "farm_offline_queue";

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => l());
}

/** Lets components re-render when the queue changes (add, remove, flush). */
export function subscribeQueue(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function readQueue(): QueuedItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeQueue(items: QueuedItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage full or unavailable — the submit itself already surfaced an
    // error to the user in this case, so fail silently here.
  }
  notify();
}

export function enqueue(kind: QueueKind, payload: any): QueuedItem {
  const item: QueuedItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    payload,
    createdAt: new Date().toISOString(),
  };
  const queue = readQueue();
  queue.push(item);
  writeQueue(queue);
  return item;
}

export function getQueue(): QueuedItem[] {
  return readQueue();
}

export function getQueueCount(): number {
  return readQueue().length;
}

export function removeFromQueue(id: string) {
  const queue = readQueue().filter((i) => i.id !== id);
  writeQueue(queue);
}

/**
 * Attempts every queued item in order, using the matching submit function
 * for its kind. Stops on the first failure (rather than hammering through
 * a long queue) — the next 'online' event or manual retry picks up where
 * it left off, since successfully-synced items are already removed.
 */
export async function flushQueue(
  submitters: Partial<Record<QueueKind, (payload: any) => Promise<any>>>
): Promise<{ synced: number; remaining: number }> {
  const queue = readQueue();
  let synced = 0;

  for (const item of queue) {
    const submit = submitters[item.kind];
    if (!submit) continue;
    try {
      await submit(item.payload);
      removeFromQueue(item.id);
      synced++;
    } catch {
      break;
    }
  }

  return { synced, remaining: getQueueCount() };
}

/**
 * Submits now if online; if it fails because of a network error (not a
 * real server error like 401/400), saves it to the queue instead so
 * nothing the supervisor entered is lost.
 */
export async function submitOrQueue<T>(
  kind: QueueKind,
  payload: any,
  submitFn: (payload: any) => Promise<T>
): Promise<{ status: "saved"; data: T } | { status: "queued" }> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    enqueue(kind, payload);
    return { status: "queued" };
  }
  try {
    const data = await submitFn(payload);
    return { status: "saved", data };
  } catch (err) {
    const isNetworkError = err instanceof TypeError && /fetch/i.test(err.message);
    if (isNetworkError) {
      enqueue(kind, payload);
      return { status: "queued" };
    }
    throw err;
  }
}