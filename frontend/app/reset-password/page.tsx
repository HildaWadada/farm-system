"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { resetPassword } from "@/lib/api";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FBF8F2] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-xl font-semibold text-[#2A2420]">Set a new password</h1>
          <p className="text-sm text-[#8A8175] mt-1">Choose a new password for your account.</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#EDE7DA] p-6 shadow-sm">
          {!token ? (
            <p className="text-sm text-[#B3261E] text-center">
              This link is missing its reset code. Request a new one from{" "}
              <a href="/forgot-password" className="underline">
                the forgot password page
              </a>
              .
            </p>
          ) : success ? (
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-[#EAF2EA] text-[#2F5233] flex items-center justify-center mx-auto mb-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <p className="text-sm text-[#2A2420] font-medium">Password updated</p>
              <p className="text-xs text-[#8A8175] mt-1">Taking you to login…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <label className="block text-xs font-medium text-[#5C554A] mb-1.5">New password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full rounded-lg border border-[#E2DACB] px-3 py-2.5 text-sm mb-4
                           focus:outline-none focus:ring-2 focus:ring-[#2F5233]/30 focus:border-[#2F5233]"
              />

              <label className="block text-xs font-medium text-[#5C554A] mb-1.5">Confirm password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-[#E2DACB] px-3 py-2.5 text-sm mb-4
                           focus:outline-none focus:ring-2 focus:ring-[#2F5233]/30 focus:border-[#2F5233]"
              />

              {error && (
                <p className="text-xs text-[#B3261E] bg-[#FDECEC] border border-[#F6D2D0] rounded-lg px-3 py-2 mb-4">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#2F5233] text-white text-sm font-medium rounded-lg py-2.5
                           hover:bg-[#274429] transition-colors disabled:opacity-60"
              >
                {loading ? "Saving…" : "Set new password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
