"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) {
        router.push("/login");
        return;
      }
      const meData = await meRes.json();
      setUser(meData.user);

      const projRes = await fetch("/api/projects");
      const projData = await projRes.json();
      setProjects(projData.projects || []);
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setCreating(true);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not create project");
        setCreating(false);
        return;
      }

      setProjects([data.project, ...projects]);
      setForm({ name: "", description: "" });
      setShowForm(false);
      setCreating(false);
    } catch (err) {
      setError("Something went wrong. Try again.");
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <p className="text-sm text-ink-muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-lg font-semibold tracking-tight text-ink">
            NOVA
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-ink-muted">{user?.name}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-ink-muted hover:text-ink transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-ink">Your projects</h1>
            <p className="text-sm text-ink-muted mt-1">
              {projects.length === 0
                ? "Nothing here yet"
                : `${projects.length} project${projects.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-accent text-white text-sm font-medium px-4 py-2 hover:bg-accent-hover transition-colors"
          >
            {showForm ? "Cancel" : "New project"}
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleCreate}
            className="mb-8 border border-border bg-surface p-5"
          >
            <div className="mb-4">
              <label htmlFor="pname" className="block text-sm text-ink-muted mb-1.5">
                Project name
              </label>
              <input
                id="pname"
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-border bg-bg px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent"
                placeholder="Website redesign"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="pdesc" className="block text-sm text-ink-muted mb-1.5">
                Description (optional)
              </label>
              <textarea
                id="pdesc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="w-full border border-border bg-bg px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent resize-none"
                placeholder="What's this project about?"
              />
            </div>
            {error && (
              <p className="text-sm text-danger border-l-2 border-danger pl-3 mb-4">{error}</p>
            )}
            <button
              type="submit"
              disabled={creating}
              className="bg-accent text-white text-sm font-medium px-4 py-2 hover:bg-accent-hover transition-colors disabled:opacity-60"
            >
              {creating ? "Creating…" : "Create project"}
            </button>
          </form>
        )}

        {projects.length === 0 && !showForm ? (
          <div className="border border-dashed border-border py-16 text-center">
            <p className="text-sm text-ink-muted">
              Create your first project to start organizing tasks.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {projects.map((project) => (
              <Link
                key={project._id}
                href={`/projects/${project._id}`}
                className="block border border-border bg-surface p-5 hover:border-accent transition-colors"
              >
                <h2 className="font-medium text-ink">{project.name}</h2>
                {project.description && (
                  <p className="text-sm text-ink-muted mt-1 line-clamp-2">
                    {project.description}
                  </p>
                )}
                <p className="text-xs text-ink-muted mt-3">
                  {project.members?.length || 1} member
                  {project.members?.length === 1 ? "" : "s"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}