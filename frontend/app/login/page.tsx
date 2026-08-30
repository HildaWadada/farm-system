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
    <div className="min-h-screen flex items-center justify-center bg-[#FBF8F2] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-xl font-semibold text-[#2A2420]">Welcome to Cliff's Farm</h1>
          <p className="text-sm text-[#8A8175] mt-1">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#EDE7DA] p-6 shadow-sm">
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

          <label className="block text-xs font-medium text-[#5C554A] mb-1.5">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-lg border border-[#E2DACB] px-3 py-2.5 text-sm mb-2
                       focus:outline-none focus:ring-2 focus:ring-[#2F5233]/30 focus:border-[#2F5233]"
          />

          <div className="flex justify-end mb-5">
            <a href="/forgot-password" className="text-xs text-[#2F5233] hover:underline">
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
