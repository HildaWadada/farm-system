"use client";

import { useCallback, useEffect, useState } from "react";
import { subscribeQueue, getQueueCount, flushQueue } from "./offlineQueue";
import {
  createActivity,
  createWorker,
  createBuyer,
  createOrder,
  createPurchase,
  createVendor,
} from "./api";

/**
 * Mount this with the current auth token on any page that should keep the
 * offline queue syncing — it listens for the browser coming back online and
 * automatically replays everything queued, one at a time.
 *
 * Note: this only runs while a page using the hook is mounted (no service
 * worker), so sync happens on reconnect *while the supervisor has the app
 * open* — not silently in the background if the tab/app is fully closed.
 */
export function useOfflineSync(token: string | null) {
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const sync = useCallback(async () => {
    if (!token) return;
    setSyncing(true);
    try {
      await flushQueue({
        activity: (payload) => createActivity(token, payload),
        worker: (payload) => createWorker(token, payload),
        buyer: (payload) => createBuyer(token, payload),
        order: (payload) => createOrder(token, payload),
        purchase: (payload) => createPurchase(token, payload),
        vendor: (payload) => createVendor(token, payload),
      });
    } finally {
      setSyncing(false);
    }
  }, [token]);

  useEffect(() => {
    setPendingCount(getQueueCount());
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);

    const unsubscribe = subscribeQueue(() => setPendingCount(getQueueCount()));

    function handleOnline() {
      setIsOnline(true);
      sync();
    }
    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Catch any leftovers from a previous offline session as soon as this
    // page mounts, in case the connection came back while the app was closed.
    if (typeof navigator !== "undefined" && navigator.onLine) {
      sync();
    }

    return () => {
      unsubscribe();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [sync]);

  return { pendingCount, syncing, isOnline, syncNow: sync };
}