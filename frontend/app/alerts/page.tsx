"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { listAlerts, resolveAlert, Alert } from "@/lib/api";

const CROP_LABELS: Record<string, string> = {
  dragon_fruit: "Dragon fruit",
  citrus: "Citrus",
  hass_avocado: "Hass avocado",
  chilli: "Chilli",
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AlertsPage() {
  const router = useRouter();
  const { ready, token, role } = useRequireAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !token) return;
    refresh();
  }, [ready, token]);

  async function refresh() {
    try {
      const data = await listAlerts(token!);
      setAlerts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleResolve(id: string) {
    if (!token) return;
    setResolvingId(id);
    try {
      await resolveAlert(token, id);
      await refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setResolvingId(null);
    }
  }

  if (!ready) return null;

  const backHref = role === "owner" ? "/dashboard" : "/home";

  return (
    <div className="min-h-screen bg-[#FBF8F2] pb-8">
      <div className="bg-white border-b border-[#EDE7DA] px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.push(backHref)} className="text-[#5C554A]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span className="font-semibold text-[#2A2420] text-sm">Safety alerts</span>
      </div>

      <div className="px-4 pt-4">
        {loading && <p className="text-sm text-[#8A8175]">Loading…</p>}
        {!loading && alerts.length === 0 && (
          <p className="text-sm text-[#8A8175]">No alerts. Everything's running smoothly.</p>
        )}

        <div className="space-y-2">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="bg-white rounded-xl border border-[#EDE7DA] p-3.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 min-w-0">
                  <span
                    className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                      alert.status === "open" ? "bg-[#B3261E]" : "bg-[#2F5233]"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#2A2420]">
                      {alert.activity.notes || "Issue reported"}
                    </p>
                    <p className="text-xs text-[#8A8175] mt-0.5">
                      {alert.activity.crop === "other" && alert.activity.crop_other
                        ? alert.activity.crop_other
                        : CROP_LABELS[alert.activity.crop] || alert.activity.crop}
                      {alert.activity.worker ? ` — ${alert.activity.worker.name}` : ""} ·{" "}
                      {timeAgo(alert.created_at)}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                    alert.status === "open"
                      ? "bg-[#FDECEC] text-[#B3261E]"
                      : "bg-[#EEF3EC] text-[#2F5233]"
                  }`}
                >
                  {alert.status === "open" ? "Open" : "Resolved"}
                </span>
              </div>

              {alert.status === "open" && role === "supervisor" && (
                <button
                  onClick={() => handleResolve(alert.id)}
                  disabled={resolvingId === alert.id}
                  className="mt-3 text-xs font-medium text-[#2F5233] border border-[#2F5233]/30 rounded-lg px-3 py-1.5 hover:bg-[#EEF3EC] transition-colors disabled:opacity-60"
                >
                  {resolvingId === alert.id ? "Resolving…" : "Mark resolved"}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
