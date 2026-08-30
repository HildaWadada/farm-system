"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/useRequireAuth";
import {
  listBuyers,
  createBuyer,
  listOrders,
  createOrder,
  updateOrderStatus,
  getLiveStock,
  getMonthlyLedger,
  Buyer,
  Order,
  LiveStockItem,
  MonthlyLedger,
} from "@/lib/api";

const CROPS = [
  { value: "dragon_fruit", label: "Dragon fruit" },
  { value: "citrus", label: "Citrus" },
  { value: "hass_avocado", label: "Hass avocado" },
  { value: "chilli", label: "Chilli" },
];

function cropLabel(value: string) {
  return CROPS.find((c) => c.value === value)?.label ?? value;
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

function money(n: number | string): string {
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-[#FFF4E0] text-[#8A5B00]",
  paid: "bg-[#EEF3EC] text-[#2F5233]",
  cancelled: "bg-[#FDECEC] text-[#B3261E]",
};

const STATUS_DOT: Record<string, string> = {
  pending: "bg-[#C9962E]",
  paid: "bg-[#2F5233]",
  cancelled: "bg-[#B3261E]",
};

type StatusFilter = "all" | "pending" | "paid" | "cancelled";

export default function OrdersPage() {
  const router = useRouter();
  const { ready, token, role } = useRequireAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [liveStock, setLiveStock] = useState<LiveStockItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [crop, setCrop] = useState("citrus");
  const [buyerId, setBuyerId] = useState("");
  const [quantityKg, setQuantityKg] = useState("");
  const [price, setPrice] = useState("");
  const [logisticsFee, setLogisticsFee] = useState("");
  const [tax, setTax] = useState("");
  const [notifySms, setNotifySms] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAddBuyer, setShowAddBuyer] = useState(false);
  const [newBuyerName, setNewBuyerName] = useState("");
  const [newBuyerPhone, setNewBuyerPhone] = useState("");
  const [savingBuyer, setSavingBuyer] = useState(false);

  const [showReport, setShowReport] = useState(false);
  const [report, setReport] = useState<MonthlyLedger | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    if (!ready || !token) return;
    refresh();
  }, [ready, token]);

  async function refresh() {
    try {
      const [o, b, s] = await Promise.all([
        listOrders(token!),
        listBuyers(token!),
        getLiveStock(token!),
      ]);
      setOrders(o);
      setBuyers(b);
      setLiveStock(s);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function stockFor(cropValue: string): string {
    const item = liveStock.find((s) => s.crop === cropValue);
    return item ? item.available_kg : "0";
  }

  // ── KPI stats, computed from what we already have ──
  const stats = useMemo(() => {
    const active = orders.filter((o) => o.status !== "cancelled");
    const totalRevenue = active
      .filter((o) => o.status === "paid")
      .reduce((sum, o) => sum + Number(o.total_amount), 0);
    const pendingValue = orders
      .filter((o) => o.status === "pending")
      .reduce((sum, o) => sum + Number(o.total_amount), 0);
    const completionRate =
      active.length === 0
        ? 0
        : (orders.filter((o) => o.status === "paid").length / active.length) * 100;
    return {
      totalRevenue,
      orderCount: orders.length,
      pendingValue,
      completionRate,
    };
  }, [orders]);

  const orderTotal =
    (Number(price) || 0) + (Number(logisticsFee) || 0) + (Number(tax) || 0);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matches =
          o.buyer.name.toLowerCase().includes(q) || cropLabel(o.crop).toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [orders, statusFilter, search]);

  async function handleAddBuyer() {
    if (!token || !newBuyerName.trim()) return;
    setSavingBuyer(true);
    try {
      const buyer = await createBuyer(token, {
        name: newBuyerName.trim(),
        phone: newBuyerPhone || undefined,
      });
      setBuyers((prev) => [...prev, buyer].sort((a, b) => a.name.localeCompare(b.name)));
      setBuyerId(buyer.id);
      setShowAddBuyer(false);
      setNewBuyerName("");
      setNewBuyerPhone("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add buyer");
    } finally {
      setSavingBuyer(false);
    }
  }

  async function handleSaveOrder() {
    if (!token || !buyerId || !quantityKg || !price) {
      setError("Pick a buyer and fill in quantity and subtotal.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createOrder(token, {
        buyer_id: buyerId,
        crop,
        quantity_kg: Number(quantityKg),
        price: Number(price),
        logistics_fee: Number(logisticsFee) || 0,
        tax: Number(tax) || 0,
        notify_sms: notifySms,
        notify_email: notifyEmail,
      });
      setQuantityKg("");
      setPrice("");
      setLogisticsFee("");
      setTax("");
      setNotifySms(false);
      setNotifyEmail(false);
      setShowForm(false);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save order");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(orderId: string, newStatus: "pending" | "paid" | "cancelled") {
    if (!token) return;
    try {
      await updateOrderStatus(token, orderId, newStatus);
      refresh();
    } catch (err) {
      console.error(err);
    }
  }

  async function openReport() {
    setShowReport(true);
    if (!token) return;
    setReportLoading(true);
    try {
      const r = await getMonthlyLedger(token);
      setReport(r);
    } catch (err) {
      console.error(err);
    } finally {
      setReportLoading(false);
    }
  }

  if (!ready) return null;

  const backHref = role === "owner" ? "/dashboard" : "/home";

  return (
    <div className="min-h-screen bg-[#FBF8F2] pb-8">
      <div className="bg-white border-b border-[#EDE7DA] px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push(backHref)} className="text-[#5C554A]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <span className="font-semibold text-[#2A2420] text-sm">Sales orders</span>
        </div>
        {role === "supervisor" && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="text-xs font-medium text-white bg-forest rounded-lg px-3 py-1.5 hover:bg-forestDark transition-colors"
          >
            {showForm ? "Cancel" : "+ New order"}
          </button>
        )}
      </div>

      <div className="px-4 pt-4">
        {/* KPI stat cards */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <StatCard label="Total revenue" value={`KES ${money(stats.totalRevenue)}`} accent="text-forest" />
          <StatCard label="Orders" value={String(stats.orderCount)} accent="text-[#2A2420]" />
          <StatCard label="Pending value" value={`KES ${money(stats.pendingValue)}`} accent="text-[#8A5B00]" />
          <StatCard label="Completion rate" value={`${stats.completionRate.toFixed(1)}%`} accent="text-forest" />
        </div>

        {/* Live stock strip */}
        <p className="text-[11px] uppercase tracking-wide text-[#8A8175] font-medium mb-2">
          Live stock
        </p>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {CROPS.map((c) => (
            <div key={c.value} className="bg-white rounded-lg border border-[#EDE7DA] py-2 px-1 text-center">
              <p className="text-sm font-semibold text-forest">{stockFor(c.value)}</p>
              <p className="text-[9px] text-[#8A8175] leading-tight mt-0.5">{c.label}</p>
            </div>
          ))}
        </div>

        <button
          onClick={openReport}
          className="w-full mb-5 text-xs font-medium text-forest border border-forest/30 rounded-lg py-2 hover:bg-[#EAF2EA] transition-colors flex items-center justify-center gap-1.5"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
          </svg>
          Monthly ledger report
        </button>

        {/* New order form */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-[#EDE7DA] p-4 mb-5">
            <p className="text-xs font-medium text-[#5C554A] mb-2">Crop</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {CROPS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCrop(c.value)}
                  className={`text-sm rounded-lg py-2 border transition-colors ${
                    crop === c.value
                      ? "bg-[#EAF2EA] border-forest text-forest"
                      : "border-[#E2DACB] text-[#5C554A]"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-[#8A8175] -mt-2 mb-4">
              {stockFor(crop)}kg available
            </p>

            <p className="text-xs font-medium text-[#5C554A] mb-1.5">Buyer</p>
            {!showAddBuyer ? (
              <div className="flex gap-2 mb-4">
                <select
                  value={buyerId}
                  onChange={(e) => setBuyerId(e.target.value)}
                  className="flex-1 rounded-lg border border-[#E2DACB] px-3 py-2 text-sm bg-white
                             focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
                >
                  <option value="">Select a buyer</option>
                  {buyers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setShowAddBuyer(true)}
                  className="text-xs font-medium text-forest border border-forest/30 rounded-lg px-3 whitespace-nowrap hover:bg-[#EAF2EA] transition-colors"
                >
                  + Add buyer
                </button>
              </div>
            ) : (
              <div className="border border-[#E2DACB] rounded-lg p-3 mb-4 space-y-2 bg-[#FBF8F2]">
                <input
                  value={newBuyerName}
                  onChange={(e) => setNewBuyerName(e.target.value)}
                  placeholder="Buyer's name"
                  className="w-full rounded-lg border border-[#E2DACB] px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
                />
                <input
                  value={newBuyerPhone}
                  onChange={(e) => setNewBuyerPhone(e.target.value)}
                  placeholder="Phone (optional)"
                  className="w-full rounded-lg border border-[#E2DACB] px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddBuyer}
                    disabled={savingBuyer || !newBuyerName.trim()}
                    className="flex-1 bg-forest text-white text-xs font-medium rounded-lg py-2 hover:bg-forestDark transition-colors disabled:opacity-60"
                  >
                    {savingBuyer ? "Saving…" : "Save buyer"}
                  </button>
                  <button onClick={() => setShowAddBuyer(false)} className="text-xs text-[#8A8175] px-3">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <p className="text-xs font-medium text-[#5C554A] mb-1.5">Quantity (kg)</p>
                <input
                  type="number"
                  inputMode="decimal"
                  value={quantityKg}
                  onChange={(e) => setQuantityKg(e.target.value)}
                  placeholder="e.g. 30"
                  className="w-full rounded-lg border border-[#E2DACB] px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
                />
              </div>
              <div>
                <p className="text-xs font-medium text-[#5C554A] mb-1.5">Subtotal</p>
                <input
                  type="number"
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g. 15000"
                  className="w-full rounded-lg border border-[#E2DACB] px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
                />
              </div>
              <div>
                <p className="text-xs font-medium text-[#5C554A] mb-1.5">Logistics fee</p>
                <input
                  type="number"
                  inputMode="decimal"
                  value={logisticsFee}
                  onChange={(e) => setLogisticsFee(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-lg border border-[#E2DACB] px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
                />
              </div>
              <div>
                <p className="text-xs font-medium text-[#5C554A] mb-1.5">Tax</p>
                <input
                  type="number"
                  inputMode="decimal"
                  value={tax}
                  onChange={(e) => setTax(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-lg border border-[#E2DACB] px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
                />
              </div>
            </div>

            {/* Order summary */}
            <div className="bg-[#EAF2EA] rounded-xl p-3 mb-4">
              <div className="flex justify-between text-xs text-[#5C554A] mb-1">
                <span>Subtotal</span>
                <span>KES {money(price || 0)}</span>
              </div>
              <div className="flex justify-between text-xs text-[#5C554A] mb-1">
                <span>Logistics fee</span>
                <span>KES {money(logisticsFee || 0)}</span>
              </div>
              <div className="flex justify-between text-xs text-[#5C554A] mb-2">
                <span>Tax</span>
                <span>KES {money(tax || 0)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold text-forest border-t border-forest/20 pt-2">
                <span>Total amount</span>
                <span>KES {money(orderTotal)}</span>
              </div>
            </div>

            {/* Notify — preference only, not wired to a real messaging provider yet */}
            <div className="mb-4 space-y-1.5">
              <label className="flex items-center gap-2 text-xs text-[#5C554A]">
                <input
                  type="checkbox"
                  checked={notifySms}
                  onChange={(e) => setNotifySms(e.target.checked)}
                  className="rounded border-[#E2DACB]"
                />
                Notify buyer by SMS
              </label>
              <label className="flex items-center gap-2 text-xs text-[#5C554A]">
                <input
                  type="checkbox"
                  checked={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.checked)}
                  className="rounded border-[#E2DACB]"
                />
                Notify buyer by email
              </label>
              <p className="text-[10px] text-[#B0A99B]">
                These are saved as a preference for now — no SMS/email service is connected yet, so nothing is actually sent.
              </p>
            </div>

            {error && (
              <p className="text-xs text-[#B3261E] bg-[#FDECEC] border border-[#F6D2D0] rounded-lg px-3 py-2 mb-3">
                {error}
              </p>
            )}

            <button
              onClick={handleSaveOrder}
              disabled={saving}
              className="w-full bg-forest text-white text-sm font-medium rounded-lg py-2.5 hover:bg-forestDark transition-colors disabled:opacity-60"
            >
              {saving ? "Saving…" : "Confirm order"}
            </button>
          </div>
        )}

        {/* Search + status filter */}
        <div className="flex items-center gap-2 mb-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search buyer or crop…"
            className="flex-1 rounded-lg border border-[#E2DACB] px-3 py-2 text-sm bg-white
                       focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
          />
        </div>
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
          {(["all", "pending", "paid", "cancelled"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-xs font-medium rounded-full px-3 py-1.5 whitespace-nowrap capitalize border transition-colors ${
                statusFilter === s
                  ? "bg-forest text-white border-forest"
                  : "bg-white text-[#5C554A] border-[#E2DACB]"
              }`}
            >
              {s === "all" ? "All orders" : s}
            </button>
          ))}
        </div>

        {/* Order history */}
        {loading && <p className="text-sm text-[#8A8175]">Loading…</p>}
        {!loading && filteredOrders.length === 0 && (
          <p className="text-sm text-[#8A8175]">No orders match.</p>
        )}
        <div className="space-y-2">
          {filteredOrders.map((o) => (
            <div key={o.id} className="bg-white rounded-xl border border-[#EDE7DA] p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#2A2420]">
                    {o.buyer.name} · {cropLabel(o.crop)}
                  </p>
                  <p className="text-xs text-[#8A8175] mt-0.5">
                    {o.quantity_kg}kg · KES {money(o.total_amount)} · {timeAgo(o.created_at)}
                  </p>
                </div>
                <span
                  className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 capitalize ${STATUS_STYLES[o.status]}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[o.status]}`} />
                  {o.status}
                </span>
              </div>

              {(Number(o.logistics_fee) > 0 || Number(o.tax) > 0) && (
                <p className="text-[10px] text-[#B0A99B] mt-1">
                  Subtotal KES {money(o.price)}
                  {Number(o.logistics_fee) > 0 ? ` · Logistics KES ${money(o.logistics_fee)}` : ""}
                  {Number(o.tax) > 0 ? ` · Tax KES ${money(o.tax)}` : ""}
                </p>
              )}

              {role === "supervisor" && o.status === "pending" && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleStatusChange(o.id, "paid")}
                    className="text-xs font-medium text-forest border border-forest/30 rounded-lg px-3 py-1.5 hover:bg-[#EAF2EA] transition-colors"
                  >
                    Mark paid
                  </button>
                  <button
                    onClick={() => handleStatusChange(o.id, "cancelled")}
                    className="text-xs font-medium text-[#B3261E] border border-[#B3261E]/30 rounded-lg px-3 py-1.5 hover:bg-[#FDECEC] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Monthly ledger report modal */}
      {showReport && (
        <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center z-20 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-[#2A2420]">Monthly ledger report</p>
              <button onClick={() => setShowReport(false)} className="text-[#8A8175]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {reportLoading && <p className="text-sm text-[#8A8175]">Loading…</p>}

            {!reportLoading && report && (
              <>
                <p className="text-xs text-[#8A8175] mb-3">{report.month}</p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <StatCard label="Total revenue" value={`KES ${money(report.total_revenue)}`} accent="text-forest" />
                  <StatCard label="Orders" value={String(report.order_count)} accent="text-[#2A2420]" />
                  <StatCard label="Total kg sold" value={`${money(report.total_kg)}kg`} accent="text-[#2A2420]" />
                  <StatCard label="Avg order value" value={`KES ${money(report.avg_order_value)}`} accent="text-forest" />
                </div>

                <p className="text-[11px] uppercase tracking-wide text-[#8A8175] font-medium mb-2">
                  By crop
                </p>
                <div className="bg-[#FBF8F2] rounded-xl border border-[#EDE7DA] divide-y divide-[#EDE7DA] overflow-hidden">
                  {report.by_crop.length === 0 && (
                    <p className="px-3 py-3 text-xs text-[#8A8175]">No orders this month yet.</p>
                  )}
                  {report.by_crop.map((c) => (
                    <div key={c.crop} className="px-3 py-2.5 flex items-center justify-between">
                      <span className="text-sm text-[#2A2420]">{cropLabel(c.crop)}</span>
                      <span className="text-xs text-[#8A8175]">
                        {money(c.quantity_kg)}kg · KES {money(c.revenue)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="bg-white rounded-xl border border-[#EDE7DA] py-3 px-3">
      <p className={`text-base font-semibold ${accent}`}>{value}</p>
      <p className="text-[10px] text-[#8A8175] mt-0.5 leading-tight">{label}</p>
    </div>
  );
}
