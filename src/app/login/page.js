"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError("Could not reach the server. Try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="text-lg font-semibold tracking-tight text-ink">
          NOVA
        </Link>

        <h1 className="mt-8 text-2xl font-semibold text-ink">Welcome back</h1>
        <p className="mt-1 text-sm text-ink-muted">Sign in to your workspace</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm text-ink-muted mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full border border-border bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm text-ink-muted mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full border border-border bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-danger border-l-2 border-danger pl-3">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-white text-sm font-medium py-2.5 hover:bg-accent-hover transition-colors disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-sm text-ink-muted">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-ink font-medium hover:text-accent">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}