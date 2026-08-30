"use client";

import { useState } from "react";
import { forgotPassword } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await forgotPassword(email);
      // Always show the same generic success state, whether or not the email
      // matched an account — this avoids confirming which emails are registered.
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FBF8F2] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-xl font-semibold text-[#2A2420]">Reset your password</h1>
          <p className="text-sm text-[#8A8175] mt-1">
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#EDE7DA] p-6 shadow-sm">
          {submitted ? (
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-[#EAF2EA] text-[#2F5233] flex items-center justify-center mx-auto mb-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <p className="text-sm text-[#2A2420] font-medium mb-1">Check your email</p>
              <p className="text-xs text-[#8A8175]">
                If an account exists with that email, a reset link is on its way. It expires in 30 minutes.
              </p>
              <a href="/login" className="inline-block mt-5 text-xs text-[#2F5233] font-medium hover:underline">
                Back to login
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <label className="block text-xs font-medium text-[#5C554A] mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
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
                {loading ? "Sending…" : "Send reset link"}
              </button>

              <a
                href="/login"
                className="block text-center text-xs text-[#8A8175] hover:underline mt-4"
              >
                Back to login
              </a>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
