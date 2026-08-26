"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function useRequireAuth(requiredRole?: "owner" | "supervisor") {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("token");
    const r = localStorage.getItem("role");
    const n = localStorage.getItem("name");

    if (!t) {
      router.push("/login");
      return;
    }
    if (requiredRole && r !== requiredRole) {
      router.push(r === "owner" ? "/dashboard" : "/entry");
      return;
    }

    setToken(t);
    setRole(r);
    setName(n);
    setReady(true);
  }, [router, requiredRole]);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("name");
    router.push("/login");
  }

  return { ready, token, role, name, logout };
}
