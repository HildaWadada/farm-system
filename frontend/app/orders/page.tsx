"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/useRequireAuth";
import {
  listBuyers,
  createBuyer,
  listOrders,
  createOrder,
  updateOrderStatus,
  getLiveStock,
  Buyer,
  Order,
  LiveStockItem,
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

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-[#FFF4E0] text-[#8A5B00]",
  paid: "bg-[#EEF3EC] text-[#2F5233]",
  cancelled: "bg-[#F1EFEA] text-[#8A8175]",
};

export default function OrdersPage() {
  const router = useRouter();
  const { ready, token, role } = useRequireAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [liveStock, setLiveStock] = useState<LiveStockItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [crop, setCrop] = useState("citrus");
  const [buyerId, setBuyerId] = useState("");
  const [quantityKg, setQuantityKg] = useState("");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAddBuyer, setShowAddBuyer] = useState(false);
  const [newBuyerName, setNewBuyerName] = useState("");
  const [newBuyerPhone, setNewBuyerPhone] = useState("");
  const [savingBuyer, setSavingBuyer] = useState(false);

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
      setError("Pick a buyer and fill in quantity and price.");
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
      });
      setQuantityKg("");
      setPrice("");
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
          <span className="font-semibold text-[#2A2420] text-sm">Orders</span>
        </div>
        {role === "supervisor" && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="text-xs font-medium text-forest border border-forest/30 rounded-lg px-3 py-1.5 hover:bg-[#EAF2EA] transition-colors"
          >
            {showForm ? "Cancel" : "+ New order"}
          </button>
        )}
      </div>

      <div className="px-4 pt-4">
        {/* Live stock strip */}
        <p className="text-[11px] uppercase tracking-wide text-[#8A8175] font-medium mb-2">
          Live stock
        </p>
        <div className="grid grid-cols-4 gap-2 mb-5">
          {CROPS.map((c) => (
            <div key={c.value} className="bg-white rounded-lg border border-[#EDE7DA] py-2 px-1 text-center">
              <p className="text-sm font-semibold text-forest">{stockFor(c.value)}</p>
              <p className="text-[9px] text-[#8A8175] leading-tight mt-0.5">{c.label}</p>
            </div>
          ))}
        </div>

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
                <p className="text-xs font-medium text-[#5C554A] mb-1.5">Price (total)</p>
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
              {saving ? "Saving…" : "Save order"}
            </button>
          </div>
        )}

        {/* Order history */}
        <p className="text-[11px] uppercase tracking-wide text-[#8A8175] font-medium mb-2">
          Order history
        </p>
        {loading && <p className="text-sm text-[#8A8175]">Loading…</p>}
        {!loading && orders.length === 0 && (
          <p className="text-sm text-[#8A8175]">No orders logged yet.</p>
        )}
        <div className="space-y-2">
          {orders.map((o) => (
            <div key={o.id} className="bg-white rounded-xl border border-[#EDE7DA] p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#2A2420]">
                    {o.buyer.name} · {cropLabel(o.crop)}
                  </p>
                  <p className="text-xs text-[#8A8175] mt-0.5">
                    {o.quantity_kg}kg · KES {Number(o.price).toLocaleString()} · {timeAgo(o.created_at)}
                  </p>
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 capitalize ${STATUS_STYLES[o.status]}`}>
                  {o.status}
                </span>
              </div>

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
    </div>
  );
}
