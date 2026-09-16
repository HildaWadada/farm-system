"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { listActivities, updateActivity, listWorkers, Activity, Worker } from "@/lib/api";

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
const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

function isEditable(item: Activity): boolean {
  return Date.now() - new Date(item.created_at).getTime() <= EDIT_WINDOW_MS;
}

export default function ActivityFeedPage() {
  const router = useRouter();
  const { ready, token, role } = useRequireAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [cropFilter, setCropFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [editingItem, setEditingItem] = useState<Activity | null>(null);

  useEffect(() => {
    if (!ready || !token) return;
    listWorkers(token).then(setWorkers).catch((err) => console.error(err));
  }, [ready, token]);

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

  async function refreshActivities() {
    if (!token) return;
    try {
      const items = await listActivities(token);
      setActivities(items);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
    }
  }

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
                        {item.photo_url && (
                          <img
                            src={item.photo_url}
                            alt="Issue photo"
                            className="w-16 h-16 object-cover rounded-lg border border-[#EDE7DA] mt-1.5"
                          />
                        )}
                      </div>
                    </div>
                    <span className="text-[11px] text-[#B0A99B] flex-shrink-0 whitespace-nowrap flex items-center gap-2">
                      {timeAgo(item.created_at)}
                      {role === "supervisor" && isEditable(item) && (
                        <button
                          onClick={() => setEditingItem(item)}
                          className="text-forest hover:underline"
                          aria-label="Edit entry"
                        >
                          Edit
                        </button>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
      </div>

      {editingItem && (
        <EditActivityModal
          item={editingItem}
          token={token!}
          workers={workers}
          onClose={() => setEditingItem(null)}
          onSaved={() => {
            setEditingItem(null);
            refreshActivities();
          }}
        />
      )}
    </div>
  );
}

function EditActivityModal({
  item,
  token,
  workers,
  onClose,
  onSaved,
}: {
  item: Activity;
  token: string;
  workers: Worker[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [activityType, setActivityType] = useState(item.activity_type);
  const [activityTypeOther, setActivityTypeOther] = useState(item.activity_type_other || "");
  const [crop, setCrop] = useState(item.crop);
  const [cropOther, setCropOther] = useState(item.crop_other || "");
  const [workerId, setWorkerId] = useState(item.worker?.id || "");
  const [quantityKg, setQuantityKg] = useState(item.quantity_kg || "");
  const [notes, setNotes] = useState(item.notes || "");
  const [photoPreview, setPhotoPreview] = useState<string | null>(item.photo_url);
  const [compressingPhoto, setCompressingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCompressingPhoto(true);

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxSide = 1000;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setCompressingPhoto(false);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setPhotoPreview(canvas.toDataURL("image/jpeg", 0.7));
        setCompressingPhoto(false);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function handleSave() {
    if (crop === "other" && !cropOther.trim()) {
      setError('Type the crop name for "Other".');
      return;
    }
    if (activityType === "other" && !activityTypeOther.trim()) {
      setError('Type the activity name for "Other".');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateActivity(token, item.id, {
        activity_type: activityType,
        activity_type_other: activityType === "other" ? activityTypeOther.trim() : undefined,
        crop,
        crop_other: crop === "other" ? cropOther.trim() : undefined,
        worker_id: workerId || undefined,
        quantity_kg: activityType === "harvest" && quantityKg ? Number(quantityKg) : undefined,
        notes: notes || undefined,
        photo_url: activityType === "issue" && photoPreview ? photoPreview : undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save changes");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center z-20 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-[#2A2420]">Edit entry</p>
          <button onClick={onClose} className="text-[#8A8175]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-xs font-medium text-[#5C554A] mb-1.5">Crop</p>
        <select
          value={crop}
          onChange={(e) => setCrop(e.target.value)}
          className="w-full rounded-lg border border-[#E2DACB] px-3 py-2 text-sm mb-2 bg-white
                     focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
        >
          {CROPS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        {crop === "other" && (
          <input
            value={cropOther}
            onChange={(e) => setCropOther(e.target.value)}
            placeholder="What crop was it?"
            className="w-full rounded-lg border border-[#E2DACB] px-3 py-2 text-sm mb-2
                       focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
          />
        )}

        <p className="text-xs font-medium text-[#5C554A] mb-1.5 mt-2">Activity</p>
        <select
          value={activityType}
          onChange={(e) => setActivityType(e.target.value)}
          className="w-full rounded-lg border border-[#E2DACB] px-3 py-2 text-sm mb-2 bg-white
                     focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
        >
          {ACTIVITY_TYPES.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
        {activityType === "other" && (
          <input
            value={activityTypeOther}
            onChange={(e) => setActivityTypeOther(e.target.value)}
            placeholder="What was the activity?"
            className="w-full rounded-lg border border-[#E2DACB] px-3 py-2 text-sm mb-2
                       focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
          />
        )}

        <p className="text-xs font-medium text-[#5C554A] mb-1.5 mt-2">Worker</p>
        <select
          value={workerId}
          onChange={(e) => setWorkerId(e.target.value)}
          className="w-full rounded-lg border border-[#E2DACB] px-3 py-2 text-sm mb-2 bg-white
                     focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
        >
          <option value="">No worker selected</option>
          {workers.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>

        {activityType === "harvest" && (
          <>
            <p className="text-xs font-medium text-[#5C554A] mb-1.5 mt-2">Quantity (kg)</p>
            <input
              type="number"
              inputMode="decimal"
              value={quantityKg}
              onChange={(e) => setQuantityKg(e.target.value)}
              className="w-full rounded-lg border border-[#E2DACB] px-3 py-2 text-sm mb-2
                         focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
            />
          </>
        )}

        {activityType === "issue" && (
          <>
            <p className="text-xs font-medium text-[#5C554A] mb-1.5 mt-2">What did you see?</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-[#E2DACB] px-3 py-2 text-sm mb-2
                         focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
            />

            <p className="text-xs font-medium text-[#5C554A] mb-1.5 mt-2">Photo</p>
            {!photoPreview ? (
              <label className="flex items-center justify-center gap-2 border border-dashed border-[#C9C2B2] rounded-lg py-3 text-xs text-[#5C554A] cursor-pointer hover:bg-[#FBF8F2] transition-colors">
                {compressingPhoto ? "Processing…" : "Take or choose a photo"}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoSelect}
                  className="hidden"
                  disabled={compressingPhoto}
                />
              </label>
            ) : (
              <div className="relative inline-block">
                <img
                  src={photoPreview}
                  alt="Issue photo preview"
                  className="w-24 h-24 object-cover rounded-lg border border-[#E2DACB]"
                />
                <button
                  onClick={() => setPhotoPreview(null)}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border border-[#E2DACB] flex items-center justify-center text-[#5C554A] shadow-sm"
                  aria-label="Remove photo"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </>
        )}

        {error && (
          <p className="text-xs text-[#B3261E] bg-[#FDECEC] border border-[#F6D2D0] rounded-lg px-3 py-2 mt-3">
            {error}
          </p>
        )}

        <button
          onClick={handleSave}
          disabled={saving || compressingPhoto}
          className="w-full bg-forest text-white text-sm font-medium rounded-lg py-2.5 mt-4 hover:bg-forestDark transition-colors disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
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
