"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await login(email, password);

      // Store token — swap for httpOnly cookie via an API route before production use.
      localStorage.setItem("token", res.access_token);
      localStorage.setItem("role", res.role);
      localStorage.setItem("name", res.name);

      if (res.must_change_password) {
        router.push("/change-password");
        return;
      }

      router.push(res.role === "owner" ? "/dashboard" : "/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4">
      {/* Background photo */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/farm/dragonfruit-rows.jpg')" }}
      />
      {/* Dark overlay so the card and text stay readable */}
      <div className="absolute inset-0 bg-black/40" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white drop-shadow-lg tracking-tight">Welcome to Cliff's Farm</h1>
          <p className="text-sm text-white/90 mt-2">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 p-6 shadow-lg">
          <label className="block text-xs font-medium text-white/90 mb-1.5">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-white/50 bg-white/90 px-3 py-2.5 text-sm text-[#2A2420] mb-4
                       placeholder:text-[#6B6459] focus:outline-none focus:ring-2 focus:ring-white/70 focus:border-white/70"
          />

          <label className="block text-xs font-medium text-white/90 mb-1.5">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-lg border border-white/50 bg-white/90 px-3 py-2.5 text-sm text-[#2A2420] mb-2
                       placeholder:text-[#6B6459] focus:outline-none focus:ring-2 focus:ring-white/70 focus:border-white/70"
          />

          <div className="flex justify-end mb-5">
            <a href="/forgot-password" className="text-xs font-semibold text-white drop-shadow hover:underline">
              Forgot password?
            </a>
          </div>

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
            {loading ? "Signing in…" : "Log in"}
          </button>
        </form>
      </div>
    </div>
  );
}
