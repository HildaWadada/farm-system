"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { getWorker, WorkerDetail } from "@/lib/api";

const CROP_LABELS: Record<string, string> = {
  dragon_fruit: "Dragon fruit",
  citrus: "Citrus",
  hass_avocado: "Hass avocado",
  chilli: "Chilli",
};

const ACTIVITY_LABELS: Record<string, string> = {
  spray: "Spray",
  weed: "Weeding",
  irrigate: "Irrigation",
  fertilize: "Fertilizing",
  harvest: "Harvest",
  issue: "Issue",
};

export default function WorkerDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { ready, token } = useRequireAuth();
  const [worker, setWorker] = useState<WorkerDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready || !token || !params.id) return;
    getWorker(token, params.id)
      .then(setWorker)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [ready, token, params.id]);

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-[#FBF8F2] pb-8">
      <div className="bg-white border-b border-[#EDE7DA] px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.push("/workers")} className="text-[#5C554A]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span className="font-semibold text-[#2A2420] text-sm">Worker profile</span>
      </div>

      <div className="px-4 pt-4">
        {loading && <p className="text-sm text-[#8A8175]">Loading…</p>}

        {!loading && worker && (
          <>
            <div className="bg-white rounded-xl border border-[#EDE7DA] p-4 mb-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#EEF3EC] text-forest font-medium flex items-center justify-center flex-shrink-0">
                {worker.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-base font-semibold text-[#2A2420]">{worker.name}</p>
                <p className="text-xs text-[#8A8175]">
                  {worker.role || "No role set"}
                  {worker.phone ? ` · ${worker.phone}` : ""}
                </p>
              </div>
            </div>

            <p className="text-[11px] uppercase tracking-wide text-[#8A8175] font-medium mb-2">
              Activity history ({worker.activities.length})
            </p>
            <div className="bg-white rounded-xl border border-[#EDE7DA] divide-y divide-[#EDE7DA] overflow-hidden">
              {worker.activities.length === 0 && (
                <p className="px-4 py-4 text-sm text-[#8A8175]">
                  No activity logged for this worker yet.
                </p>
              )}
              {worker.activities.map((a) => (
                <div key={a.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-[#2A2420]">
                      {ACTIVITY_LABELS[a.activity_type] || a.activity_type} ·{" "}
                      {CROP_LABELS[a.crop] || a.crop}
                    </p>
                    <span className="text-[11px] text-[#B0A99B] whitespace-nowrap">
                      {new Date(a.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  {a.notes && <p className="text-xs text-[#8A8175] mt-0.5">{a.notes}</p>}
                </div>
              ))}
            </div>
          </>
        )}

        {!loading && !worker && (
          <p className="text-sm text-[#8A8175]">Worker not found.</p>
        )}
      </div>
    </div>
  );
}
