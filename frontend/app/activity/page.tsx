"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { listActivities, Activity } from "@/lib/api";

const CROPS = [
  { value: "dragon_fruit", label: "Dragon fruit" },
  { value: "citrus", label: "Citrus" },
  { value: "hass_avocado", label: "Hass avocado" },
  { value: "chilli", label: "Chilli" },
  { value: "other", label: "Other" },
];

const ACTIVITY_TYPES = [
  { value: "spray", label: "Spray" },
  { value: "weed", label: "Weed" },
  { value: "harvest", label: "Harvest" },
  { value: "irrigate", label: "Irrigate" },
  { value: "fertilize", label: "Fertilize" },
  { value: "issue", label: "Issue" },
  { value: "other", label: "Other" },
];

function cropLabel(value: string, customText?: string | null) {
  if (value === "other" && customText) return customText;
  return CROPS.find((c) => c.value === value)?.label ?? value;
}
function activityLabel(value: string, customText?: string | null) {
  if (value === "other" && customText) return customText;
  return ACTIVITY_TYPES.find((a) => a.value === value)?.label ?? value;
}

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

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString([], { month: "long", day: "numeric" });
}

const POLL_MS = 15000;

export default function ActivityFeedPage() {
  const router = useRouter();
  const { ready, token, role } = useRequireAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [cropFilter, setCropFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  useEffect(() => {
    if (!ready || !token) return;

    let cancelled = false;

    async function load() {
      try {
        const items = await listActivities(token!);
        if (!cancelled) {
          setActivities(items);
          setLastUpdated(new Date());
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [ready, token]);

  const filtered = useMemo(() => {
    return activities.filter((a) => {
      if (cropFilter !== "all" && a.crop !== cropFilter) return false;
      if (typeFilter !== "all" && a.activity_type !== typeFilter) return false;
      return true;
    });
  }, [activities, cropFilter, typeFilter]);

  const grouped = useMemo(() => {
    const groups: { label: string; items: Activity[] }[] = [];
    for (const item of filtered) {
      const label = dayLabel(item.created_at);
      const last = groups[groups.length - 1];
      if (last && last.label === label) {
        last.items.push(item);
      } else {
        groups.push({ label, items: [item] });
      }
    }
    return groups;
  }, [filtered]);

  if (!ready) return null;

  const backHref = role === "owner" ? "/dashboard" : "/home";

  return (
    <div className="min-h-screen bg-[#FBF8F2] pb-8">
      <div className="bg-white border-b border-[#EDE7DA] px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push(backHref)} className="text-[#5C554A]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <span className="font-semibold text-[#2A2420] text-sm">Activity feed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-forest animate-pulse" />
            <span className="text-[10px] text-[#8A8175]">
              {lastUpdated
                ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                : "Loading…"}
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1 -mx-4 px-4">
          <FilterChip label="All crops" active={cropFilter === "all"} onClick={() => setCropFilter("all")} />
          {CROPS.map((c) => (
            <FilterChip
              key={c.value}
              label={c.label}
              active={cropFilter === c.value}
              onClick={() => setCropFilter(c.value)}
            />
          ))}
        </div>
        <div className="flex gap-1.5 mt-1.5 overflow-x-auto pb-1 -mx-4 px-4">
          <FilterChip label="All activity" active={typeFilter === "all"} onClick={() => setTypeFilter("all")} />
          {ACTIVITY_TYPES.map((a) => (
            <FilterChip
              key={a.value}
              label={a.label}
              active={typeFilter === a.value}
              onClick={() => setTypeFilter(a.value)}
            />
          ))}
        </div>
      </div>

      <div className="px-4 pt-4">
        {loading && <p className="text-sm text-[#8A8175]">Loading…</p>}
        {!loading && filtered.length === 0 && (
          <p className="text-sm text-[#8A8175]">No entries match these filters.</p>
        )}

        {!loading &&
          grouped.map((group) => (
            <div key={group.label} className="mb-5">
              <p className="text-[11px] uppercase tracking-wide text-[#8A8175] font-medium mb-2">
                {group.label}
              </p>
              <div className="bg-white rounded-xl border border-[#EDE7DA] divide-y divide-[#EDE7DA] overflow-hidden">
                {group.items.map((item) => (
                  <div key={item.id} className="px-4 py-3 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span
                        className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                          item.activity_type === "issue" ? "bg-[#B3261E]" : "bg-[#2F5233]"
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="text-sm text-[#2A2420]">
                          {activityLabel(item.activity_type, item.activity_type_other)} ·{" "}
                          {cropLabel(item.crop, item.crop_other)}
                        </p>
                        {item.worker && (
                          <p className="text-xs text-[#5C554A] mt-0.5">{item.worker.name}</p>
                        )}
                        {item.notes && (
                          <p className="text-xs text-[#8A8175] mt-0.5">{item.notes}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-[11px] text-[#B0A99B] flex-shrink-0 whitespace-nowrap">
                      {timeAgo(item.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-xs font-medium rounded-full px-3 py-1.5 whitespace-nowrap flex-shrink-0 border transition-colors ${
        active
          ? "bg-forest text-white border-forest"
          : "bg-white text-[#5C554A] border-[#E2DACB]"
      }`}
    >
      {label}
    </button>
  );
}
