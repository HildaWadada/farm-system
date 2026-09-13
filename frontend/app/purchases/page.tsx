"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/useRequireAuth";
import {
  listVendors,
  createVendor,
  listPurchases,
  createPurchase,
  updatePurchaseStatus,
  Vendor,
  Purchase,
} from "@/lib/api";

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

export default function PurchasesPage() {
  const router = useRouter();
  const { ready, token, role } = useRequireAuth();

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [vendorId, setVendorId] = useState("");
  const [item, setItem] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [cost, setCost] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAddVendor, setShowAddVendor] = useState(false);
  const [newVendorName, setNewVendorName] = useState("");
  const [newVendorPhone, setNewVendorPhone] = useState("");
  const [savingVendor, setSavingVendor] = useState(false);

  useEffect(() => {
    if (!ready || !token) return;
    refresh();
  }, [ready, token]);

  async function refresh() {
    try {
      const [p, v] = await Promise.all([listPurchases(token!), listVendors(token!)]);
      setPurchases(p);
      setVendors(v);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    const active = purchases.filter((p) => p.status !== "cancelled");
    const totalSpend = active
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + Number(p.cost), 0);
    const pendingValue = purchases
      .filter((p) => p.status === "pending")
      .reduce((sum, p) => sum + Number(p.cost), 0);
    const completionRate =
      active.length === 0
        ? 0
        : (purchases.filter((p) => p.status === "paid").length / active.length) * 100;
    return { totalSpend, purchaseCount: purchases.length, pendingValue, completionRate };
  }, [purchases]);

  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matches = p.vendor.name.toLowerCase().includes(q) || p.item.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [purchases, statusFilter, search]);

  async function handleAddVendor() {
    if (!token || !newVendorName.trim()) return;
    setSavingVendor(true);
    try {
      const vendor = await createVendor(token, {
        name: newVendorName.trim(),
        phone: newVendorPhone || undefined,
      });
      setVendors((prev) => [...prev, vendor].sort((a, b) => a.name.localeCompare(b.name)));
      setVendorId(vendor.id);
      setShowAddVendor(false);
      setNewVendorName("");
      setNewVendorPhone("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add vendor");
    } finally {
      setSavingVendor(false);
    }
  }

  async function handleSavePurchase() {
    if (!token || !vendorId || !item.trim() || !quantity || !cost) {
      setError("Pick a vendor and fill in item, quantity, and cost.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createPurchase(token, {
        vendor_id: vendorId,
        item: item.trim(),
        quantity: Number(quantity),
        unit: unit || undefined,
        cost: Number(cost),
      });
      setItem("");
      setQuantity("");
      setUnit("");
      setCost("");
      setShowForm(false);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save purchase");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(purchaseId: string, newStatus: "pending" | "paid" | "cancelled") {
    if (!token) return;
    try {
      await updatePurchaseStatus(token, purchaseId, newStatus);
      refresh();
    } catch (err) {
      console.error(err);
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
          <span className="font-semibold text-[#2A2420] text-sm">Purchases</span>
        </div>
        {role === "supervisor" && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="text-xs font-medium text-white bg-forest rounded-lg px-3 py-1.5 hover:bg-forestDark transition-colors"
          >
            {showForm ? "Cancel" : "+ New purchase"}
          </button>
        )}
      </div>

      <div className="px-4 pt-4">
        {/* KPI stat cards */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          <StatCard label="Total spend" value={`KES ${money(stats.totalSpend)}`} accent="text-forest" />
          <StatCard label="Purchases" value={String(stats.purchaseCount)} accent="text-[#2A2420]" />
          <StatCard label="Pending value" value={`KES ${money(stats.pendingValue)}`} accent="text-[#8A5B00]" />
          <StatCard label="Completion rate" value={`${stats.completionRate.toFixed(1)}%`} accent="text-forest" />
        </div>

        {/* New purchase form */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-[#EDE7DA] p-4 mb-5">
            <p className="text-xs font-medium text-[#5C554A] mb-1.5">Vendor</p>
            {!showAddVendor ? (
              <div className="flex gap-2 mb-4">
                <select
                  value={vendorId}
                  onChange={(e) => setVendorId(e.target.value)}
                  className="flex-1 rounded-lg border border-[#E2DACB] px-3 py-2 text-sm bg-white
                             focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
                >
                  <option value="">Select a vendor</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setShowAddVendor(true)}
                  className="text-xs font-medium text-forest border border-forest/30 rounded-lg px-3 whitespace-nowrap hover:bg-[#EAF2EA] transition-colors"
                >
                  + Add vendor
                </button>
              </div>
            ) : (
              <div className="border border-[#E2DACB] rounded-lg p-3 mb-4 space-y-2 bg-[#FBF8F2]">
                <input
                  value={newVendorName}
                  onChange={(e) => setNewVendorName(e.target.value)}
                  placeholder="Vendor's name"
                  className="w-full rounded-lg border border-[#E2DACB] px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
                />
                <input
                  value={newVendorPhone}
                  onChange={(e) => setNewVendorPhone(e.target.value)}
                  placeholder="Phone (optional)"
                  className="w-full rounded-lg border border-[#E2DACB] px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddVendor}
                    disabled={savingVendor || !newVendorName.trim()}
                    className="flex-1 bg-forest text-white text-xs font-medium rounded-lg py-2 hover:bg-forestDark transition-colors disabled:opacity-60"
                  >
                    {savingVendor ? "Saving…" : "Save vendor"}
                  </button>
                  <button onClick={() => setShowAddVendor(false)} className="text-xs text-[#8A8175] px-3">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <p className="text-xs font-medium text-[#5C554A] mb-1.5">Item</p>
            <input
              value={item}
              onChange={(e) => setItem(e.target.value)}
              placeholder="e.g. NPK fertilizer"
              className="w-full rounded-lg border border-[#E2DACB] px-3 py-2 text-sm mb-4
                         focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
            />

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div>
                <p className="text-xs font-medium text-[#5C554A] mb-1.5">Quantity</p>
                <input
                  type="number"
                  inputMode="decimal"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="e.g. 5"
                  className="w-full rounded-lg border border-[#E2DACB] px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
                />
              </div>
              <div>
                <p className="text-xs font-medium text-[#5C554A] mb-1.5">Unit</p>
                <input
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="kg, bags…"
                  className="w-full rounded-lg border border-[#E2DACB] px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
                />
              </div>
              <div>
                <p className="text-xs font-medium text-[#5C554A] mb-1.5">Cost</p>
                <input
                  type="number"
                  inputMode="decimal"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="e.g. 4500"
                  className="w-full rounded-lg border border-[#E2DACB] px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-[#B3261E] bg-[#FDECEC] border border-[#F6D2D0] rounded-lg px-3 py-2 mb-3">
                {error}
              </p>
            )}

            <button
              onClick={handleSavePurchase}
              disabled={saving}
              className="w-full bg-forest text-white text-sm font-medium rounded-lg py-2.5 hover:bg-forestDark transition-colors disabled:opacity-60"
            >
              {saving ? "Saving…" : "Confirm purchase"}
            </button>
          </div>
        )}

        {/* Search + status filter */}
        <div className="flex items-center gap-2 mb-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vendor or item…"
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
              {s === "all" ? "All purchases" : s}
            </button>
          ))}
        </div>

        {/* Purchase history */}
        {loading && <p className="text-sm text-[#8A8175]">Loading…</p>}
        {!loading && filteredPurchases.length === 0 && (
          <p className="text-sm text-[#8A8175]">No purchases match.</p>
        )}
        <div className="space-y-2">
          {filteredPurchases.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border border-[#EDE7DA] p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#2A2420]">
                    {p.vendor.name} · {p.item}
                  </p>
                  <p className="text-xs text-[#8A8175] mt-0.5">
                    {p.quantity}{p.unit ? p.unit : ""} · KES {money(p.cost)} · {timeAgo(p.created_at)}
                  </p>
                </div>
                <span
                  className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 capitalize ${STATUS_STYLES[p.status]}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[p.status]}`} />
                  {p.status}
                </span>
              </div>

              {role === "supervisor" && p.status === "pending" && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleStatusChange(p.id, "paid")}
                    className="text-xs font-medium text-forest border border-forest/30 rounded-lg px-3 py-1.5 hover:bg-[#EAF2EA] transition-colors"
                  >
                    Mark paid
                  </button>
                  <button
                    onClick={() => handleStatusChange(p.id, "cancelled")}
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
