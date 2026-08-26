"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { listBuyers, createBuyer, Buyer } from "@/lib/api";

export default function BuyersPage() {
  const router = useRouter();
  const { ready, token, role } = useRequireAuth();
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !token) return;
    refresh();
  }, [ready, token]);

  async function refresh() {
    try {
      const items = await listBuyers(token!);
      setBuyers(items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!token || !name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createBuyer(token, { name: name.trim(), phone: phone || undefined });
      setName("");
      setPhone("");
      setShowAdd(false);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add buyer");
    } finally {
      setSaving(false);
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
          <span className="font-semibold text-[#2A2420] text-sm">Buyers</span>
        </div>
        {role === "supervisor" && (
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="text-xs font-medium text-forest border border-forest/30 rounded-lg px-3 py-1.5 hover:bg-[#EAF2EA] transition-colors"
          >
            {showAdd ? "Cancel" : "+ Add buyer"}
          </button>
        )}
      </div>

      <div className="px-4 pt-4">
        {showAdd && (
          <div className="bg-white rounded-xl border border-[#EDE7DA] p-3.5 mb-4 space-y-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Buyer's name"
              className="w-full rounded-lg border border-[#E2DACB] px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone (optional)"
              className="w-full rounded-lg border border-[#E2DACB] px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
            />
            {error && (
              <p className="text-xs text-[#B3261E] bg-[#FDECEC] border border-[#F6D2D0] rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <button
              onClick={handleAdd}
              disabled={saving || !name.trim()}
              className="w-full bg-forest text-white text-sm font-medium rounded-lg py-2.5 hover:bg-forestDark transition-colors disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save buyer"}
            </button>
          </div>
        )}

        {loading && <p className="text-sm text-[#8A8175]">Loading…</p>}
        {!loading && buyers.length === 0 && !showAdd && (
          <p className="text-sm text-[#8A8175]">
            No buyers added yet. {role === "supervisor" ? "Tap \"+ Add buyer\" to get started." : ""}
          </p>
        )}

        <div className="bg-white rounded-xl border border-[#EDE7DA] divide-y divide-[#EDE7DA] overflow-hidden">
          {buyers.map((b) => (
            <div key={b.id} className="px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#EEF3EC] text-forest text-xs font-medium flex items-center justify-center flex-shrink-0">
                {b.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#2A2420] truncate">{b.name}</p>
                <p className="text-xs text-[#8A8175] truncate">{b.phone || "No phone on file"}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
