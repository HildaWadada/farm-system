"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { createActivity, listWorkers, createWorker, Worker } from "@/lib/api";

const CROPS = [
  { value: "dragon_fruit", label: "Dragon fruit" },
  { value: "citrus", label: "Citrus" },
  { value: "hass_avocado", label: "Hass avocado" },
  { value: "chilli", label: "Chilli" },
  { value: "other", label: "Other" },
];

const ACTIVITIES = [
  { value: "spray", label: "Spray" },
  { value: "weed", label: "Weed" },
  { value: "harvest", label: "Harvest" },
  { value: "irrigate", label: "Irrigate" },
  { value: "fertilize", label: "Fertilize" },
  { value: "issue", label: "Issue" },
  { value: "other", label: "Other" },
];



export default function EntryPage() {
  const router = useRouter();
  const { ready, token, name } = useRequireAuth("supervisor");

  const [crop, setCrop] = useState("citrus");
  const [cropOther, setCropOther] = useState("");
  const [activityType, setActivityType] = useState("harvest");
  const [activityTypeOther, setActivityTypeOther] = useState("");
  const [notes, setNotes] = useState("");
  const [quantityKg, setQuantityKg] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [workerId, setWorkerId] = useState<string>("");
  const [showAddWorker, setShowAddWorker] = useState(false);
  const [newWorkerName, setNewWorkerName] = useState("");
  const [newWorkerPhone, setNewWorkerPhone] = useState("");
  const [newWorkerRole, setNewWorkerRole] = useState("");
  const [savingWorker, setSavingWorker] = useState(false);

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [compressingPhoto, setCompressingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError(null);
    setCompressingPhoto(true);

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // Resize so the longest side is at most 1000px, then compress to JPEG —
        // keeps a phone photo well under a megabyte before it's sent as base64.
        const maxSide = 1000;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setPhotoError("Could not process that photo.");
          setCompressingPhoto(false);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        setPhotoPreview(dataUrl);
        setCompressingPhoto(false);
      };
      img.onerror = () => {
        setPhotoError("Could not read that image.");
        setCompressingPhoto(false);
      };
      img.src = reader.result as string;
    };
    reader.onerror = () => {
      setPhotoError("Could not read that file.");
      setCompressingPhoto(false);
    };
    reader.readAsDataURL(file);

    // Allow re-selecting the same file later after removing it.
    e.target.value = "";
  }

  async function loadWorkers(t: string) {
    try {
      const items = await listWorkers(t);
      setWorkers(items);
    } catch {
      // ignore — worker selection is optional
    }
  }

  useEffect(() => {
    if (ready && token) {
      loadWorkers(token);
    }
  }, [ready, token]);

  async function handleAddWorker() {
    if (!token || !newWorkerName.trim()) return;
    setSavingWorker(true);
    try {
      const worker = await createWorker(token, {
        name: newWorkerName.trim(),
        phone: newWorkerPhone || undefined,
        role: newWorkerRole || undefined,
      });
      setWorkers((prev) => [...prev, worker].sort((a, b) => a.name.localeCompare(b.name)));
      setWorkerId(worker.id);
      setShowAddWorker(false);
      setNewWorkerName("");
      setNewWorkerPhone("");
      setNewWorkerRole("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add worker");
    } finally {
      setSavingWorker(false);
    }
  }

  async function handleSave() {
    if (!token) return;
    setError(null);
    setSuccess(false);

    if (crop === "other" && !cropOther.trim()) {
      setError("Type the crop name for \"Other\".");
      return;
    }
    if (activityType === "other" && !activityTypeOther.trim()) {
      setError("Type the activity name for \"Other\".");
      return;
    }

    setSaving(true);

    try {
      await createActivity(token, {
        activity_type: activityType,
        activity_type_other: activityType === "other" ? activityTypeOther.trim() : undefined,
        crop,
        crop_other: crop === "other" ? cropOther.trim() : undefined,
        worker_id: workerId || undefined,
        notes: notes || undefined,
        quantity_kg: activityType === "harvest" && quantityKg ? Number(quantityKg) : undefined,
        photo_url: activityType === "issue" && photoPreview ? photoPreview : undefined,
      });
      setSuccess(true);
      setNotes("");
      setQuantityKg("");
      setCropOther("");
      setActivityTypeOther("");
      setPhotoPreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save entry");
    } finally {
      setSaving(false);
    }
  }

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-cream px-4 py-6">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/home")}
              aria-label="Back to dashboard"
              className="w-8 h-8 rounded-full border border-[#E2DACB] flex items-center justify-center text-[#5C554A] hover:bg-white transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <div>
              <h1 className="text-lg font-semibold text-[#2A2420]">New entry</h1>
              <p className="text-xs text-[#8A8175]">{name}</p>
            </div>
          </div>
        </div>

        {/* Entry form */}
        <div className="bg-white rounded-2xl border border-[#EDE7DA] p-4 shadow-sm mb-6">
          <p className="text-xs font-medium text-[#5C554A] mb-2">Crop</p>
          <div className={`grid grid-cols-3 gap-2 ${crop === "other" ? "mb-2" : "mb-4"}`}>
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
          {crop === "other" && (
            <input
              value={cropOther}
              onChange={(e) => setCropOther(e.target.value)}
              placeholder="What crop was it?"
              className="w-full rounded-lg border border-[#E2DACB] px-3 py-2 text-sm mb-4
                         focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
            />
          )}

          <p className="text-xs font-medium text-[#5C554A] mb-2">Activity</p>
          <div className={`grid grid-cols-3 gap-2 ${activityType === "other" ? "mb-2" : "mb-4"}`}>
            {ACTIVITIES.map((a) => {
              const isHarvest = a.value === "harvest";
              const isIssue = a.value === "issue";
              const selected = activityType === a.value;
              return (
                <button
                  key={a.value}
                  onClick={() => setActivityType(a.value)}
                  className={`text-xs rounded-lg py-2.5 border transition-colors ${
                    selected
                      ? isHarvest
                        ? "bg-[#EAF2EA] border-forest text-forest"
                        : isIssue
                        ? "bg-[#FDECEC] border-[#E37A73] text-[#B3261E]"
                        : "bg-[#F3F0E8] border-[#C9C2B2] text-[#2A2420]"
                      : "border-[#E2DACB] text-[#5C554A]"
                  }`}
                >
                  {a.label}
                </button>
              );
            })}
          </div>
          {activityType === "other" && (
            <input
              value={activityTypeOther}
              onChange={(e) => setActivityTypeOther(e.target.value)}
              placeholder="What was the activity?"
              className="w-full rounded-lg border border-[#E2DACB] px-3 py-2 text-sm mb-4
                         focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
            />
          )}

          {/* Worker selection */}
          <p className="text-xs font-medium text-[#5C554A] mb-1.5">Worker</p>
          {!showAddWorker ? (
            <div className="flex gap-2 mb-4">
              <select
                value={workerId}
                onChange={(e) => setWorkerId(e.target.value)}
                className="flex-1 rounded-lg border border-[#E2DACB] px-3 py-2 text-sm bg-white
                           focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
              >
                <option value="">No worker selected</option>
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                    {w.role ? ` — ${w.role}` : ""}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowAddWorker(true)}
                className="text-xs font-medium text-forest border border-forest/30 rounded-lg px-3 whitespace-nowrap hover:bg-[#EAF2EA] transition-colors"
              >
                + Add worker
              </button>
            </div>
          ) : (
            <div className="border border-[#E2DACB] rounded-lg p-3 mb-4 space-y-2 bg-[#FBF8F2]">
              <input
                value={newWorkerName}
                onChange={(e) => setNewWorkerName(e.target.value)}
                placeholder="Worker's name"
                className="w-full rounded-lg border border-[#E2DACB] px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
              />
              <input
                value={newWorkerPhone}
                onChange={(e) => setNewWorkerPhone(e.target.value)}
                placeholder="Phone (optional)"
                className="w-full rounded-lg border border-[#E2DACB] px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
              />
              <input
                value={newWorkerRole}
                onChange={(e) => setNewWorkerRole(e.target.value)}
                placeholder="Role (optional, e.g. Field worker)"
                className="w-full rounded-lg border border-[#E2DACB] px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddWorker}
                  disabled={savingWorker || !newWorkerName.trim()}
                  className="flex-1 bg-forest text-white text-xs font-medium rounded-lg py-2 hover:bg-forestDark transition-colors disabled:opacity-60"
                >
                  {savingWorker ? "Saving…" : "Save worker"}
                </button>
                <button
                  onClick={() => setShowAddWorker(false)}
                  className="text-xs text-[#8A8175] px-3"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          <p className="text-[11px] text-[#B0A99B] -mt-2 mb-4">
            Save a worker once — next time just pick them from the list above.
          </p>

          {activityType === "harvest" && (
            <div className="mb-4">
              <p className="text-xs font-medium text-[#5C554A] mb-1.5">Quantity harvested (kg)</p>
              <input
                type="number"
                inputMode="decimal"
                value={quantityKg}
                onChange={(e) => setQuantityKg(e.target.value)}
                placeholder="e.g. 45"
                className="w-full rounded-lg border border-[#E2DACB] px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
              />
            </div>
          )}

          {activityType === "issue" && (
            <div className="mb-4">
              <p className="text-xs font-medium text-[#5C554A] mb-1.5">What did you see?</p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Pest sighted on lower leaves"
                rows={2}
                className="w-full rounded-lg border border-[#E2DACB] px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
              />

              <p className="text-xs font-medium text-[#5C554A] mb-1.5 mt-3">Photo (optional)</p>
              {!photoPreview ? (
                <label className="flex items-center justify-center gap-2 border border-dashed border-[#C9C2B2] rounded-lg py-3 text-xs text-[#5C554A] cursor-pointer hover:bg-[#FBF8F2] transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
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
                    className="w-28 h-28 object-cover rounded-lg border border-[#E2DACB]"
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
              {photoError && <p className="text-[11px] text-[#B3261E] mt-1">{photoError}</p>}
            </div>
          )}

          {error && (
            <p className="text-xs text-[#B3261E] bg-[#FDECEC] border border-[#F6D2D0] rounded-lg px-3 py-2 mb-3">
              {error}
            </p>
          )}
          {success && (
            <p className="text-xs text-forest bg-[#EAF2EA] border border-[#CFE3CF] rounded-lg px-3 py-2 mb-3">
              Entry saved.
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={saving || compressingPhoto}
            className="w-full bg-forest text-white text-sm font-medium rounded-lg py-2.5
                       hover:bg-forestDark transition-colors disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save entry"}
          </button>
        </div>
      </div>
    </div>
  );
}
