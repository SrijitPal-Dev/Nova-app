"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";

const COLUMNS = [
  { key: "todo", label: "To do" },
  { key: "in-progress", label: "In progress" },
  { key: "done", label: "Done" },
];

const PRIORITY_COLOR = {
  low: "border-l-border",
  medium: "border-l-warn",
  high: "border-l-danger",
};

export default function ProjectPage({ params }) {
  const { id } = use(params);
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [project, setProject] = useState(null);
  const [role, setRole] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", priority: "medium", assignee: "" });
  const [creating, setCreating] = useState(false);

  const [showMemberForm, setShowMemberForm] = useState(false);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberError, setMemberError] = useState("");

  useEffect(() => {
    async function load() {
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) {
        router.push("/login");
        return;
      }
      const meData = await meRes.json();
      setUser(meData.user);

      const projRes = await fetch(`/api/projects/${id}`);
      const projData = await projRes.json();
      if (!projRes.ok) {
        setError(projData.error || "Could not load project");
        setLoading(false);
        return;
      }
      setProject(projData.project);
      setRole(projData.role);

      const tasksRes = await fetch(`/api/projects/${id}/tasks`);
      const tasksData = await tasksRes.json();
      setTasks(tasksData.tasks || []);

      setLoading(false);
    }
    load();
  }, [id, router]);

  async function handleCreateTask(e) {
    e.preventDefault();
    setCreating(true);

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...taskForm, projectId: id, assignee: taskForm.assignee || null }),
    });
    const data = await res.json();

    if (res.ok) {
      setTasks([data.task, ...tasks]);
      setTaskForm({ title: "", description: "", priority: "medium", assignee: "" });
      setShowTaskForm(false);
    }
    setCreating(false);
  }

  async function handleStatusChange(taskId, newStatus) {
    setTasks(tasks.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t)));

    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
  }

  async function handleDeleteTask(taskId) {
    setTasks(tasks.filter((t) => t._id !== taskId));
    await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
  }

  async function handleAddMember(e) {
    e.preventDefault();
    setMemberError("");

    const res = await fetch(`/api/projects/${id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: memberEmail, role: "member" }),
    });
    const data = await res.json();

    if (!res.ok) {
      setMemberError(data.error || "Could not add member");
      return;
    }

    setProject(data.project);
    setMemberEmail("");
    setShowMemberForm(false);
  }

  async function handleRemoveMember(memberUserId) {
    const res = await fetch(`/api/projects/${id}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberUserId }),
    });
    const data = await res.json();
    if (res.ok) setProject(data.project);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <p className="text-sm text-ink-muted">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg px-6 text-center">
        <p className="text-sm text-danger">{error}</p>
        <Link href="/dashboard" className="mt-4 text-sm text-ink-muted hover:text-ink">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const canManage = role === "owner" || role === "admin";
  const doneCount = tasks.filter((t) => t.status === "done").length;
  const progress = tasks.length === 0 ? 0 : Math.round((doneCount / tasks.length) * 100);

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-lg font-semibold tracking-tight text-ink">
            NOVA
          </Link>
          <span className="text-sm text-ink-muted">{user?.name}</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <Link href="/dashboard" className="text-sm text-ink-muted hover:text-ink">
          ← All projects
        </Link>

        <div className="mt-4 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-ink">{project.name}</h1>
            {project.description && (
              <p className="text-sm text-ink-muted mt-1 max-w-xl">{project.description}</p>
            )}
          </div>
          <button
            onClick={() => setShowTaskForm(!showTaskForm)}
            className="bg-accent text-white text-sm font-medium px-4 py-2 hover:bg-accent-hover transition-colors shrink-0"
          >
            {showTaskForm ? "Cancel" : "New task"}
          </button>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-border max-w-xs">
            <div
              className="h-full bg-accent transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-ink-muted">
            {doneCount}/{tasks.length} done
          </span>
        </div>

        <div className="mt-6 border-b border-border pb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {project.members?.map((m) => (
              <span
                key={m.user._id}
                className="inline-flex items-center gap-2 text-xs border border-border px-2.5 py-1 text-ink-muted"
              >
                {m.user.name}
                <span className="text-ink-muted/70">· {m.role}</span>
                {canManage && m.role !== "owner" && (
                  <button
                    onClick={() => handleRemoveMember(m.user._id)}
                    className="text-danger hover:text-danger/70"
                    aria-label={`Remove ${m.user.name}`}
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
          {canManage && (
            <button
              onClick={() => setShowMemberForm(!showMemberForm)}
              className="text-sm text-ink-muted hover:text-ink whitespace-nowrap"
            >
              {showMemberForm ? "Cancel" : "+ Add member"}
            </button>
          )}
        </div>

        {showMemberForm && (
          <form onSubmit={handleAddMember} className="mt-4 flex gap-2 items-start">
            <input
              type="email"
              required
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
              placeholder="teammate@company.com"
              className="border border-border bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent flex-1 max-w-xs"
            />
            <button
              type="submit"
              className="bg-accent text-white text-sm font-medium px-4 py-2 hover:bg-accent-hover transition-colors"
            >
              Add
            </button>
            {memberError && <p className="text-sm text-danger self-center">{memberError}</p>}
          </form>
        )}

        {showTaskForm && (
          <form onSubmit={handleCreateTask} className="mt-6 border border-border bg-surface p-5">
            <div className="mb-4">
              <label className="block text-sm text-ink-muted mb-1.5">Title</label>
              <input
                type="text"
                required
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                className="w-full border border-border bg-bg px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent"
                placeholder="Design the homepage hero"
              />
            </div>
            <div className="mb-4 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-ink-muted mb-1.5">Priority</label>
                <select
                  value={taskForm.priority}
                  onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                  className="w-full border border-border bg-bg px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-ink-muted mb-1.5">Assignee</label>
                <select
                  value={taskForm.assignee}
                  onChange={(e) => setTaskForm({ ...taskForm, assignee: e.target.value })}
                  className="w-full border border-border bg-bg px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent"
                >
                  <option value="">Unassigned</option>
                  {project.members?.map((m) => (
                    <option key={m.user._id} value={m.user._id}>
                      {m.user.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={creating}
              className="bg-accent text-white text-sm font-medium px-4 py-2 hover:bg-accent-hover transition-colors disabled:opacity-60"
            >
              {creating ? "Adding…" : "Add task"}
            </button>
          </form>
        )}

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
          {COLUMNS.map((col) => (
            <div key={col.key}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-ink">{col.label}</h3>
                <span className="text-xs text-ink-muted">
                  {tasks.filter((t) => t.status === col.key).length}
                </span>
              </div>
              <div className="space-y-2 min-h-[80px]">
                {tasks
                  .filter((t) => t.status === col.key)
                  .map((task) => (
                    <div
                      key={task._id}
                      className={`border border-border border-l-2 ${PRIORITY_COLOR[task.priority]} bg-surface p-3`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-ink">{task.title}</p>
                        <button
                          onClick={() => handleDeleteTask(task._id)}
                          className="text-ink-muted hover:text-danger text-xs shrink-0"
                          aria-label="Delete task"
                        >
                          ×
                        </button>
                      </div>
                      {task.assignee && (
                        <p className="text-xs text-ink-muted mt-2">{task.assignee.name}</p>
                      )}
                      <select
                        value={task.status}
                        onChange={(e) => handleStatusChange(task._id, e.target.value)}
                        className="mt-3 w-full text-xs border border-border bg-bg px-2 py-1 text-ink-muted focus:outline-none focus:border-accent"
                      >
                        {COLUMNS.map((c) => (
                          <option key={c.key} value={c.key}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                {tasks.filter((t) => t.status === col.key).length === 0 && (
                  <div className="border border-dashed border-border py-6 text-center">
                    <p className="text-xs text-ink-muted">Empty</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}