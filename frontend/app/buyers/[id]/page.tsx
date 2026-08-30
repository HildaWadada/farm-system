"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { getBuyer, BuyerDetail } from "@/lib/api";

const CROP_LABELS: Record<string, string> = {
  dragon_fruit: "Dragon fruit",
  citrus: "Citrus",
  hass_avocado: "Hass avocado",
  chilli: "Chilli",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-[#FFF4E0] text-[#8A5B00]",
  paid: "bg-[#EEF3EC] text-[#2F5233]",
  cancelled: "bg-[#FDECEC] text-[#B3261E]",
};

function money(n: number | string): string {
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function BuyerDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { ready, token } = useRequireAuth();
  const [buyer, setBuyer] = useState<BuyerDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready || !token || !params.id) return;
    getBuyer(token, params.id)
      .then(setBuyer)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [ready, token, params.id]);

  if (!ready) return null;

  const totalSpend =
    buyer?.orders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + Number(o.total_amount), 0) ?? 0;

  return (
    <div className="min-h-screen bg-[#FBF8F2] pb-8">
      <div className="bg-white border-b border-[#EDE7DA] px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.push("/buyers")} className="text-[#5C554A]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span className="font-semibold text-[#2A2420] text-sm">Buyer profile</span>
      </div>

      <div className="px-4 pt-4">
        {loading && <p className="text-sm text-[#8A8175]">Loading…</p>}

        {!loading && buyer && (
          <>
            <div className="bg-white rounded-xl border border-[#EDE7DA] p-4 mb-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#EEF3EC] text-forest font-medium flex items-center justify-center flex-shrink-0">
                {buyer.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-base font-semibold text-[#2A2420]">{buyer.name}</p>
                <p className="text-xs text-[#8A8175]">
                  {buyer.category || "No category set"}
                  {buyer.phone ? ` · ${buyer.phone}` : ""}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-5">
              <div className="bg-white rounded-xl border border-[#EDE7DA] py-3 px-3">
                <p className="text-base font-semibold text-forest">KES {money(totalSpend)}</p>
                <p className="text-[10px] text-[#8A8175] mt-0.5">Total spend (excl. cancelled)</p>
              </div>
              <div className="bg-white rounded-xl border border-[#EDE7DA] py-3 px-3">
                <p className="text-base font-semibold text-[#2A2420]">{buyer.orders.length}</p>
                <p className="text-[10px] text-[#8A8175] mt-0.5">Total orders</p>
              </div>
            </div>

            <p className="text-[11px] uppercase tracking-wide text-[#8A8175] font-medium mb-2">
              Order history
            </p>
            <div className="bg-white rounded-xl border border-[#EDE7DA] divide-y divide-[#EDE7DA] overflow-hidden">
              {buyer.orders.length === 0 && (
                <p className="px-4 py-4 text-sm text-[#8A8175]">No orders logged for this buyer yet.</p>
              )}
              {buyer.orders.map((o) => (
                <div key={o.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-[#2A2420]">
                      {CROP_LABELS[o.crop] || o.crop} · {o.quantity_kg}kg
                    </p>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 capitalize ${STATUS_STYLES[o.status]}`}
                    >
                      {o.status}
                    </span>
                  </div>
                  <p className="text-xs text-[#8A8175] mt-0.5">
                    KES {money(o.total_amount)} ·{" "}
                    {new Date(o.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}

        {!loading && !buyer && <p className="text-sm text-[#8A8175]">Buyer not found.</p>}
      </div>
    </div>
  );
}
