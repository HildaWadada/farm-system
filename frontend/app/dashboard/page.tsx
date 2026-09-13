"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/useRequireAuth";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  getSummary,
  listAlerts,
  getLiveStock,
  listOrders,
  listWorkers,
  Summary,
  Alert,
  LiveStockItem,
  Order,
  Worker,
} from "@/lib/api";

const CROP_LABELS: Record<string, string> = {
  dragon_fruit: "Dragon fruit",
  citrus: "Citrus",
  hass_avocado: "Hass avocado",
  chilli: "Chilli",
};

const LOW_STOCK_THRESHOLD_KG = 50; // placeholder heuristic — adjust to match real target levels later

function money(n: number | string): string {
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
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

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function orderCode(id: string): string {
  return `ORD-${id.slice(0, 6).toUpperCase()}`;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-[#FFF4E0] text-[#8A5B00]",
  paid: "bg-[#EEF3EC] text-[#2F5233]",
  cancelled: "bg-[#FDECEC] text-[#B3261E]",
};

function downloadOrdersPdf(orders: Order[]) {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.setTextColor(47, 82, 51); // forest green
  doc.text("Cliff's Farm — Orders Report", 14, 18);

  doc.setFontSize(9);
  doc.setTextColor(140, 129, 117);
  doc.text(`Generated ${new Date().toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}`, 14, 24);

  const rows = orders.map((o) => [
    orderCode(o.id),
    o.buyer.name,
    CROP_LABELS[o.crop] || o.crop,
    `${o.quantity_kg} kg`,
    `KES ${money(o.total_amount)}`,
    o.status,
    shortDate(o.created_at),
  ]);

  autoTable(doc, {
    startY: 30,
    head: [["Order ID", "Buyer", "Crop", "Quantity", "Amount", "Status", "Date"]],
    body: rows,
    headStyles: { fillColor: [47, 82, 51] },
    styles: { fontSize: 8, cellPadding: 3 },
    alternateRowStyles: { fillColor: [251, 248, 242] },
  });

  doc.save(`orders-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export default function OwnerDashboardPage() {
  const router = useRouter();
  const { ready, token, name, logout } = useRequireAuth("owner");

  const [summary, setSummary] = useState<Summary | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [liveStock, setLiveStock] = useState<LiveStockItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready || !token) return;
    async function load() {
      try {
        const [s, a, stock, o, w] = await Promise.all([
          getSummary(token!),
          listAlerts(token!),
          getLiveStock(token!),
          listOrders(token!),
          listWorkers(token!),
        ]);
        setSummary(s);
        setAlerts(a);
        setLiveStock(stock);
        setOrders(o);
        setWorkers(w);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [ready, token]);

  const openAlerts = useMemo(() => alerts.filter((a) => a.status === "open"), [alerts]);
  const activeOrders = useMemo(() => orders.filter((o) => o.status !== "cancelled"), [orders]);
  const pendingOrders = useMemo(() => orders.filter((o) => o.status === "pending"), [orders]);
  const totalStockKg = useMemo(
    () => liveStock.reduce((sum, s) => sum + Number(s.available_kg), 0),
    [liveStock]
  );

  if (!ready) return null;

  const firstName = name ? name.split(" ")[0] : "Owner";

  const navItems: { label: string; icon: React.ReactNode; href: string; active?: boolean }[] = [
    {
      label: "Dashboard",
      href: "/dashboard",
      active: true,
      icon: <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />,
    },
    {
      label: "Field operations",
      href: "/activity",
      icon: <path d="M3 12h4l3 8 4-16 3 8h4" />,
    },
    {
      label: "Sales records",
      href: "/orders",
      icon: (
        <>
          <path d="M6 2l1.5 5h9L18 2" />
          <path d="M3.5 7h17l-1.6 11.2A2 2 0 0117 20H7a2 2 0 01-1.9-1.8L3.5 7z" />
        </>
      ),
    },
    {
      label: "Buyers",
      href: "/buyers",
      icon: (
        <>
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </>
      ),
    },
    {
      label: "Personnel",
      href: "/workers",
      icon: (
        <>
          <circle cx="9" cy="7" r="4" />
          <path d="M2 21v-2a4 4 0 014-4h6a4 4 0 014 4v2" />
          <path d="M16 3.13a4 4 0 010 7.75M22 21v-2a4 4 0 00-3-3.87" />
        </>
      ),
    },
    {
      label: "Purchases",
      href: "/purchases",
      icon: (
        <>
          <path d="M20 7h-9M14 17H5" />
          <circle cx="17" cy="17" r="3" />
          <circle cx="7" cy="7" r="3" />
        </>
      ),
    },
    {
      label: "Alerts",
      href: "/alerts",
      icon: (
        <>
          <path d="M12 9v4M12 17h.01" />
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#F4F1EA] flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-[#EDE7DA] flex flex-col fixed top-0 bottom-0 left-0">
        <div className="px-5 py-5 flex items-center gap-2 border-b border-[#EDE7DA]">
          <span className="font-semibold text-[#2A2420] text-sm">CLIFF'S FARM</span>
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => router.push(item.href)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                item.active
                  ? "bg-[#EAF2EA] text-forest font-medium"
                  : "text-[#5C554A] hover:bg-[#FBF8F2]"
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
                {item.icon}
              </svg>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="border-t border-[#EDE7DA] px-2 py-3 space-y-0.5">
          <button
            onClick={() => router.push("/settings/password")}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[#5C554A] hover:bg-[#FBF8F2] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
            Settings
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[#B3261E] hover:bg-[#FDECEC] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <path d="M16 17l5-5-5-5M21 12H9" />
            </svg>
            Log out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 ml-56">
        {/* Top bar */}
        <div className="bg-white border-b border-[#EDE7DA] px-6 py-3 flex items-center justify-between sticky top-0 z-10">
          <p className="text-xs text-[#8A8175]">Dashboard</p>
          <div className="flex items-center gap-4">
            <div className="relative">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B0A99B" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                placeholder="Search farm records…"
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#E2DACB] bg-[#FBF8F2] w-56
                           focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
              />
            </div>
            <button onClick={() => router.push("/alerts")} className="relative text-[#5C554A]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
              {openAlerts.length > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#B3261E] text-white text-[8px] flex items-center justify-center">
                  {openAlerts.length}
                </span>
              )}
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#2F5233] text-white text-xs flex items-center justify-center font-medium">
                {firstName.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-medium text-[#2A2420] leading-tight">{name}</p>
                <p className="text-[10px] text-[#8A8175] leading-tight">Farm owner</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Page heading */}
          <div className="mb-6">
            <h1 className="text-lg font-semibold text-[#2A2420]">Farm overview</h1>
            <p className="text-xs text-[#8A8175] mt-0.5">Real-time operational summary for Cliff's Farm</p>
          </div>

          {/* KPI cards — real current figures, no fabricated trend deltas */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <KpiCard
              label="Active orders"
              value={loading ? "—" : String(activeOrders.length)}
              onClick={() => router.push("/orders")}
              icon={
                <>
                  <path d="M6 2l1.5 5h9L18 2" />
                  <path d="M3.5 7h17l-1.6 11.2A2 2 0 0117 20H7a2 2 0 01-1.9-1.8L3.5 7z" />
                </>
              }
            />
            <KpiCard
              label="Live stock (kg)"
              value={loading ? "—" : totalStockKg.toFixed(0)}
              onClick={() => router.push("/orders")}
              icon={<path d="M20 12V8H6a2 2 0 010-4h12v4M4 6v14a2 2 0 002 2h14v-4M18 12a2 2 0 100 4 2 2 0 000-4z" />}
            />
            <KpiCard
              label="Pending orders"
              value={loading ? "—" : String(pendingOrders.length)}
              onClick={() => router.push("/orders")}
              icon={<path d="M12 8v4l3 3M12 22a10 10 0 100-20 10 10 0 000 20z" />}
            />
            <KpiCard
              label="Active workers"
              value={loading ? "—" : String(workers.length)}
              onClick={() => router.push("/workers")}
              icon={
                <>
                  <circle cx="9" cy="7" r="4" />
                  <path d="M2 21v-2a4 4 0 014-4h6a4 4 0 014 4v2" />
                  <path d="M16 3.13a4 4 0 010 7.75M22 21v-2a4 4 0 00-3-3.87" />
                </>
              }
            />
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            {/* Critical alerts */}
            <div className="bg-white rounded-2xl border border-[#EDE7DA] p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-[#2A2420] flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B3261E" strokeWidth="2">
                    <path d="M12 9v4M12 17h.01" />
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  Critical alerts
                </p>
                {openAlerts.length > 0 && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#FDECEC] text-[#B3261E]">
                    {openAlerts.length} Active
                  </span>
                )}
              </div>

              {loading && <p className="text-xs text-[#8A8175]">Loading…</p>}
              {!loading && openAlerts.length === 0 && (
                <p className="text-xs text-[#8A8175]">No open alerts — all clear.</p>
              )}
              <div className="space-y-3">
                {openAlerts.slice(0, 3).map((a) => (
                  <div key={a.id} className="flex items-start gap-2">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#B3261E] flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[#2A2420] truncate">
                        {a.activity.notes || "Issue reported"}
                      </p>
                      <p className="text-[10px] text-[#8A8175]">
                        {CROP_LABELS[a.activity.crop] || a.activity.crop} · {timeAgo(a.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => router.push("/alerts")}
                className="text-xs text-forest font-medium mt-3 flex items-center gap-1"
              >
                View all alerts
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>

            {/* Stock by crop */}
            <div className="bg-white rounded-2xl border border-[#EDE7DA] p-4 col-span-2">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-[#2A2420]">Stock by crop</p>
                <button onClick={() => router.push("/orders")} className="text-xs text-forest font-medium">
                  Detailed inventory
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(["dragon_fruit", "citrus", "hass_avocado", "chilli"] as const).map((crop) => {
                  const item = liveStock.find((s) => s.crop === crop);
                  const kg = item ? Number(item.available_kg) : 0;
                  const low = kg < LOW_STOCK_THRESHOLD_KG;
                  return (
                    <button
                      key={crop}
                      onClick={() => router.push("/orders")}
                      className="border border-[#EDE7DA] rounded-xl p-3 text-left hover:border-forest/40 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-[#2A2420]">{CROP_LABELS[crop]}</p>
                        <span
                          className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${
                            low ? "bg-[#FDECEC] text-[#B3261E]" : "bg-[#EEF3EC] text-[#2F5233]"
                          }`}
                        >
                          {low ? "Low stock" : "In stock"}
                        </span>
                      </div>
                      <p className="text-lg font-semibold text-forest mt-1">{kg.toFixed(0)} kg</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recent orders */}
          <div className="bg-white rounded-2xl border border-[#EDE7DA] p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-[#2A2420]">Recent orders</p>
                <p className="text-[10px] text-[#8A8175]">Latest sales logged by the supervisor</p>
              </div>
              <button
                onClick={() => downloadOrdersPdf(orders)}
                disabled={orders.length === 0}
                className="text-xs font-medium text-white bg-forest rounded-lg px-3 py-1.5 hover:bg-forestDark transition-colors disabled:opacity-50"
              >
                Download PDF
              </button>
            </div>

            {loading && <p className="text-xs text-[#8A8175]">Loading…</p>}
            {!loading && orders.length === 0 && <p className="text-xs text-[#8A8175]">No orders yet.</p>}

            {!loading && orders.length > 0 && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#EDE7DA]">
                    <th className="py-2 text-[10px] uppercase tracking-wide text-[#8A8175] font-medium">Order ID</th>
                    <th className="py-2 text-[10px] uppercase tracking-wide text-[#8A8175] font-medium">Buyer</th>
                    <th className="py-2 text-[10px] uppercase tracking-wide text-[#8A8175] font-medium">Date</th>
                    <th className="py-2 text-[10px] uppercase tracking-wide text-[#8A8175] font-medium">Amount</th>
                    <th className="py-2 text-[10px] uppercase tracking-wide text-[#8A8175] font-medium">Status</th>
                    <th className="py-2 text-[10px] uppercase tracking-wide text-[#8A8175] font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 6).map((o) => (
                    <tr
                      key={o.id}
                      onClick={() => router.push("/orders")}
                      className="border-b border-[#EDE7DA] last:border-b-0 cursor-pointer hover:bg-[#FBF8F2] transition-colors"
                    >
                      <td className="py-2.5 text-xs text-[#2A2420] font-medium">{orderCode(o.id)}</td>
                      <td className="py-2.5 text-xs text-[#2A2420]">{o.buyer.name}</td>
                      <td className="py-2.5 text-xs text-[#8A8175]">{shortDate(o.created_at)}</td>
                      <td className="py-2.5 text-xs text-[#2A2420]">KES {money(o.total_amount)}</td>
                      <td className="py-2.5">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[o.status]}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push("/orders");
                          }}
                          className="text-[#8A8175] hover:text-forest"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="5" r="1" />
                            <circle cx="12" cy="12" r="1" />
                            <circle cx="12" cy="19" r="1" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
  onClick,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="bg-white rounded-2xl border border-[#EDE7DA] p-4 flex items-center gap-3 text-left
                 hover:border-forest/40 hover:shadow-sm transition-all disabled:hover:border-[#EDE7DA] disabled:hover:shadow-none"
    >
      <div className="w-9 h-9 rounded-lg bg-[#EEF3EC] flex items-center justify-center flex-shrink-0 text-forest">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {icon}
        </svg>
      </div>
      <div>
        <p className="text-lg font-semibold text-[#2A2420] leading-tight">{value}</p>
        <p className="text-[11px] text-[#8A8175]">{label}</p>
      </div>
    </button>
  );
}
