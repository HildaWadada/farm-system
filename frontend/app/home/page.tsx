"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { getSummary, listActivities, Summary, Activity } from "@/lib/api";

const CROP_LABELS: Record<string, string> = {
  dragon_fruit: "Dragon fruit",
  citrus: "Citrus",
  hass_avocado: "Hass avocado",
  chilli: "Chilli",
};

const ACTIVITY_LABELS: Record<string, string> = {
  spray: "Spray logged",
  weed: "Weeding logged",
  irrigate: "Irrigation logged",
  fertilize: "Fertilizing logged",
  harvest: "Harvest logged",
  issue: "Issue reported",
};

function activityColumnText(a: Activity): string {
  const crop = a.crop === "other" && a.crop_other ? a.crop_other : CROP_LABELS[a.crop] || a.crop;
  if (a.activity_type === "issue") {
    return a.notes ? `Issue: ${a.notes}` : "Issue reported";
  }
  const activityLabel =
    a.activity_type === "other" && a.activity_type_other
      ? a.activity_type_other
      : ACTIVITY_LABELS[a.activity_type] || a.activity_type;
  return `${activityLabel}: ${crop}`;
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

function fullDateTime(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HomePage() {
  const router = useRouter();
  const { ready, token, name, logout } = useRequireAuth("supervisor");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [recent, setRecent] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready || !token) return;

    async function load() {
      try {
        const [s, activities] = await Promise.all([
          getSummary(token!),
          listActivities(token!),
        ]);
        setSummary(s);
        setRecent(activities.slice(0, 4));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [ready, token]);

  if (!ready) return null;

  const firstName = name ? name.split(" ")[0] : "there";
  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="min-h-screen bg-[#FBF8F2] pb-20">
      {/* Header */}
      <div className="bg-white border-b border-[#EDE7DA] px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <span className="font-semibold text-[#2A2420] text-sm tracking-wide">
          CLIFF'S FARM
        </span>
        <div className="flex items-center gap-3">
          <button
            aria-label="Notifications"
            onClick={() => router.push("/alerts")}
            className="text-[#5C554A]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 01-3.46 0" />
            </svg>
          </button>
          <button
            aria-label="Log out"
            onClick={logout}
            className="w-7 h-7 rounded-full bg-[#2F5233] text-white text-xs flex items-center justify-center font-medium"
          >
            {firstName.charAt(0).toUpperCase()}
          </button>
        </div>
      </div>

      <div className="px-4 pt-4">
        <p className="text-[11px] uppercase tracking-wide text-[#8A8175] font-medium">
          Field operations
        </p>
        <h1 className="text-lg font-semibold text-[#2A2420] mt-0.5">
          {greeting}, {firstName}
        </h1>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="bg-white rounded-xl border border-[#EDE7DA] py-3 px-2 text-center">
            <p className="text-xl font-semibold text-[#2F5233]">
              {loading ? "—" : summary?.today_entries ?? 0}
            </p>
            <p className="text-[10px] text-[#8A8175] mt-0.5 leading-tight">Today's entries</p>
          </div>
          <div className="bg-white rounded-xl border border-[#EDE7DA] py-3 px-2 text-center">
            <p className="text-xl font-semibold text-[#B3261E]">
              {loading ? "—" : summary?.active_alerts ?? 0}
            </p>
            <p className="text-[10px] text-[#8A8175] mt-0.5 leading-tight">Active alerts</p>
          </div>
          <div className="bg-white rounded-xl border border-[#EDE7DA] py-3 px-2 text-center">
            <p className="text-xl font-semibold text-[#8A8175]">
              {loading ? "—" : summary?.pending_sync ?? 0}
            </p>
            <p className="text-[10px] text-[#8A8175] mt-0.5 leading-tight">Pending sync</p>
          </div>
        </div>

        {/* New field entry */}
        <button
          onClick={() => router.push("/entry")}
          className="w-full mt-4 bg-[#2F5233] hover:bg-[#274429] transition-colors text-white text-sm font-medium rounded-xl py-3 flex items-center justify-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New field entry
        </button>

        {/* Quick access */}
        <p className="text-[11px] uppercase tracking-wide text-[#8A8175] font-medium mt-6 mb-2">
          Quick access
        </p>
        <div className="bg-white rounded-xl border border-[#EDE7DA] divide-y divide-[#EDE7DA] overflow-hidden">
          <QuickAccessRow
            title="Activity feed"
            subtitle="View recent field logs and updates"
            onClick={() => router.push("/activity")}
            icon={
              <path d="M3 12h4l3 8 4-16 3 8h4" />
            }
          />
          <QuickAccessRow
            title="Workers"
            subtitle="Add workers and view their activity"
            onClick={() => router.push("/workers")}
            icon={
              <>
                <circle cx="9" cy="7" r="4" />
                <path d="M2 21v-2a4 4 0 014-4h6a4 4 0 014 4v2" />
                <path d="M16 3.13a4 4 0 010 7.75M22 21v-2a4 4 0 00-3-3.87" />
              </>
            }
          />
          <QuickAccessRow
            title="Orders"
            subtitle="Log sales and see live stock"
            onClick={() => router.push("/orders")}
            icon={
              <>
                <path d="M6 2l1.5 5h9L18 2" />
                <path d="M3.5 7h17l-1.6 11.2A2 2 0 0117 20H7a2 2 0 01-1.9-1.8L3.5 7z" />
              </>
            }
          />
          <QuickAccessRow
            title="Buyers"
            subtitle="View and add buyer contacts"
            onClick={() => router.push("/buyers")}
            icon={
              <>
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </>
            }
          />
          <QuickAccessRow
            title="Safety alerts"
            subtitle="View and resolve equipment issues"
            onClick={() => router.push("/alerts")}
            icon={
              <>
                <path d="M12 9v4M12 17h.01" />
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </>
            }
          />
          <QuickAccessRow
            title="Sync status"
            subtitle="Everything is up to date"
            onClick={undefined}
            icon={
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            }
          />
        </div>

        {/* Recent activity */}
        <div className="flex items-center justify-between mt-6 mb-2">
          <p className="text-[11px] uppercase tracking-wide text-[#8A8175] font-medium">
            Recent activity
          </p>
          <button onClick={() => router.push("/activity")} className="text-xs text-[#2F5233] font-medium">
            View all
          </button>
        </div>
        <div className="bg-white rounded-xl border border-[#EDE7DA] overflow-hidden">
          {loading && <p className="px-4 py-4 text-sm text-[#8A8175]">Loading…</p>}
          {!loading && recent.length === 0 && (
            <p className="px-4 py-4 text-sm text-[#8A8175]">No activity logged yet.</p>
          )}
          {!loading && recent.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#EDE7DA]">
                    <th className="px-4 py-2 text-[10px] uppercase tracking-wide text-[#8A8175] font-medium whitespace-nowrap">
                      Activity
                    </th>
                    <th className="px-4 py-2 text-[10px] uppercase tracking-wide text-[#8A8175] font-medium whitespace-nowrap">
                      Person
                    </th>
                    <th className="px-4 py-2 text-[10px] uppercase tracking-wide text-[#8A8175] font-medium whitespace-nowrap">
                      Date &amp; time
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((a) => (
                    <tr key={a.id} className="border-b border-[#EDE7DA] last:border-b-0">
                      <td className="px-4 py-2.5 text-sm text-[#2A2420]">
                        <span className="flex items-center gap-2">
                          <span
                            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                              a.activity_type === "issue" ? "bg-[#B3261E]" : "bg-[#2F5233]"
                            }`}
                          />
                          <span className="whitespace-nowrap">{activityColumnText(a)}</span>
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-sm text-[#5C554A] whitespace-nowrap">
                        {a.worker ? a.worker.name : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-[#8A8175] whitespace-nowrap">
                        {fullDateTime(a.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#EDE7DA] flex items-center justify-around py-2.5">
        <NavItem label="Home" active onClick={() => router.push("/home")}>
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </NavItem>
        <NavItem label="Quick entry" onClick={() => router.push("/entry")}>
          <path d="M12 5v14M5 12h14" />
        </NavItem>
        <NavItem label="Activity" onClick={() => router.push("/activity")}>
          <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
        </NavItem>
      </div>
    </div>
  );
}

function QuickAccessRow({
  title,
  subtitle,
  onClick,
  icon,
}: {
  title: string;
  subtitle: string;
  onClick?: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-[#FBF8F2] transition-colors disabled:hover:bg-transparent"
    >
      <div className="w-8 h-8 rounded-lg bg-[#EEF3EC] flex items-center justify-center flex-shrink-0 text-[#2F5233]">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {icon}
        </svg>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-[#2A2420]">{title}</p>
        <p className="text-xs text-[#8A8175] truncate">{subtitle}</p>
      </div>
      {onClick && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B0A99B" strokeWidth="2" className="ml-auto flex-shrink-0">
          <path d="M9 18l6-6-6-6" />
        </svg>
      )}
    </button>
  );
}

function NavItem({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 px-4">
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke={active ? "#2F5233" : "#B0A99B"}
        strokeWidth="2"
      >
        {children}
      </svg>
      <span className={`text-[10px] ${active ? "text-[#2F5233] font-medium" : "text-[#B0A99B]"}`}>
        {label}
      </span>
    </button>
  );
}
