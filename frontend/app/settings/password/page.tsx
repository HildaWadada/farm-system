"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { changePassword } from "@/lib/api";

export default function SettingsPasswordPage() {
  const router = useRouter();
  const [name, setName] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    setName(localStorage.getItem("name"));
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("New passwords don't match");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    setLoading(true);
    try {
      await changePassword(token, currentPassword, newPassword);
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream px-4 py-10 flex justify-center">
      <div className="w-full max-w-sm">
        <button
          onClick={() => router.back()}
          className="text-xs text-[#8A8175] hover:text-[#2A2420] mb-6"
        >
          ← Back
        </button>

        <h1 className="text-lg font-semibold text-[#2A2420] mb-1">Change password</h1>
        <p className="text-sm text-[#8A8175] mb-6">
          {name ? `Signed in as ${name}` : "Update your account password"}
        </p>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#EDE7DA] p-6 shadow-sm">
          <label className="block text-xs font-medium text-[#5C554A] mb-1.5">Current password</label>
          <input
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full rounded-lg border border-[#E2DACB] px-3 py-2.5 text-sm mb-4
                       focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
          />

          <label className="block text-xs font-medium text-[#5C554A] mb-1.5">New password</label>
          <input
            type="password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-lg border border-[#E2DACB] px-3 py-2.5 text-sm mb-4
                       focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
          />

          <label className="block text-xs font-medium text-[#5C554A] mb-1.5">Confirm new password</label>
          <input
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-lg border border-[#E2DACB] px-3 py-2.5 text-sm mb-2
                       focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
          />

          <p className="text-xs text-[#B0A99B] mb-4">At least 8 characters.</p>

          {error && (
            <p className="text-xs text-[#B3261E] bg-[#FDECEC] border border-[#F6D2D0] rounded-lg px-3 py-2 mb-4">
              {error}
            </p>
          )}
          {success && (
            <p className="text-xs text-forest bg-[#EAF2EA] border border-[#CFE3CF] rounded-lg px-3 py-2 mb-4">
              Password updated.
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-forest text-white text-sm font-medium rounded-lg py-2.5
                       hover:bg-forestDark transition-colors disabled:opacity-60"
          >
            {loading ? "Saving…" : "Save password"}
          </button>
        </form>
      </div>
    </div>
  );
}
