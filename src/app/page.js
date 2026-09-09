"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import FluidBackground from "./components/FluidBackground";

export default function Home() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (res.ok) {
          router.push("/dashboard");
        } else {
          setChecked(true);
        }
      })
      .catch(() => setChecked(true));
  }, [router]);

  if (!checked) return null;

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-bg px-6 text-center overflow-hidden">
      <FluidBackground />

      <div className="relative z-10">
        <p className="text-sm text-ink-muted mb-4">Plan. Collaborate. Deliver.</p>
        <h1 className="text-4xl font-semibold text-ink max-w-lg leading-tight mx-auto">
          A quiet place for your team to get work done.
        </h1>
        <div className="mt-8 flex gap-3 justify-center">
          <Link
            href="/signup"
            className="bg-accent text-white text-sm font-medium px-5 py-2.5 hover:bg-accent-hover transition-colors"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="border border-border text-ink text-sm font-medium px-5 py-2.5 hover:border-accent transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}