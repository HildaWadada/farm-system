"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { listBuyers, createBuyer, Buyer } from "@/lib/api";

const CATEGORIES = ["Retailer", "Wholesaler", "Restaurant", "Exporter", "Other"];

const CATEGORY_STYLES: Record<string, string> = {
  Retailer: "bg-[#EAF2EA] text-forest",
  Wholesaler: "bg-[#E9F0FA] text-[#2C5B8A]",
  Restaurant: "bg-[#FFF4E0] text-[#8A5B00]",
  Exporter: "bg-[#F3EAF7] text-[#6B3F8A]",
  Other: "bg-[#F1EFEA] text-[#8A8175]",
};

export default function BuyersPage() {
  const router = useRouter();
  const { ready, token, role } = useRequireAuth();
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState<string>("");
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
      await createBuyer(token, {
        name: name.trim(),
        phone: phone || undefined,
        category: category || undefined,
      });
      setName("");
      setPhone("");
      setCategory("");
      setShowAdd(false);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add buyer");
    } finally {
      setSaving(false);
    }
  }

  const filtered = useMemo(() => {
    return buyers.filter((b) => {
      if (categoryFilter !== "all" && b.category !== categoryFilter) return false;
      if (search.trim() && !b.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    });
  }, [buyers, categoryFilter, search]);

  if (!ready) return null;

  const backHref = role === "owner" ? "/dashboard" : "/home";

  return (
    <div className="min-h-screen bg-[#FBF8F2] pb-8">
      <div className="bg-white border-b border-[#EDE7DA] px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push(backHref)} className="text-[#5C554A]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <span className="font-semibold text-[#2A2420] text-sm">Buyers & partners</span>
          </div>
          {role === "supervisor" && (
            <button
              onClick={() => setShowAdd((v) => !v)}
              className="text-xs font-medium text-white bg-forest rounded-lg px-3 py-1.5 hover:bg-forestDark transition-colors"
            >
              {showAdd ? "Cancel" : "+ Add buyer"}
            </button>
          )}
        </div>
        <p className="text-xs text-[#8A8175]">Your buyer contacts, and who's buying what.</p>
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
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-[#E2DACB] px-3 py-2 text-sm bg-white
                         focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
            >
              <option value="">No category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
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

        {/* Search + category filter */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search buyers…"
          className="w-full rounded-lg border border-[#E2DACB] px-3 py-2 text-sm bg-white mb-2
                     focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
        />
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
          <FilterChip label="All" active={categoryFilter === "all"} onClick={() => setCategoryFilter("all")} />
          {CATEGORIES.map((c) => (
            <FilterChip
              key={c}
              label={c}
              active={categoryFilter === c}
              onClick={() => setCategoryFilter(c)}
            />
          ))}
        </div>

        {loading && <p className="text-sm text-[#8A8175]">Loading…</p>}
        {!loading && filtered.length === 0 && (
          <p className="text-sm text-[#8A8175]">
            No buyers match. {role === "supervisor" ? "Tap \"+ Add buyer\" to add one." : ""}
          </p>
        )}

        <div className="grid grid-cols-1 gap-2.5">
          {filtered.map((b) => (
            <button
              key={b.id}
              onClick={() => router.push(`/buyers/${b.id}`)}
              className="bg-white rounded-xl border border-[#EDE7DA] p-3.5 text-left hover:border-forest/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-[#EEF3EC] text-forest font-medium flex items-center justify-center flex-shrink-0">
                    {b.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#2A2420] truncate">{b.name}</p>
                    <p className="text-xs text-[#8A8175] truncate">{b.phone || "No phone on file"}</p>
                  </div>
                </div>
                {b.category && (
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                      CATEGORY_STYLES[b.category] || CATEGORY_STYLES.Other
                    }`}
                  >
                    {b.category}
                  </span>
                )}
              </div>
              <p className="text-xs text-forest font-medium mt-2.5 flex items-center gap-1">
                Manage profile
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </p>
            </button>
          ))}
        </div>
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
        active ? "bg-forest text-white border-forest" : "bg-white text-[#5C554A] border-[#E2DACB]"
      }`}
    >
      {label}
    </button>
  );
}
