"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

function timeAgo(dateStr) {
  if (!dateStr) return "";

  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);

  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;

  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;

  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function formatDueDate(dateStr) {
  if (!dateStr) return "";

  const d = new Date(dateStr);

  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function isOverdue(task) {
  if (!task?.dueDate || task.status === "done") return false;

  return (
    new Date(task.dueDate) <
    new Date(new Date().toDateString())
  );
}

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

  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    priority: "medium",
    assignee: "",
    dueDate: "",
  });

  const [creating, setCreating] = useState(false);

  const [showMemberForm, setShowMemberForm] = useState(false);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberError, setMemberError] = useState("");

  const [editingProject, setEditingProject] = useState(false);

  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
  });

  const [savingProject, setSavingProject] = useState(false);
  const [projectError, setProjectError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
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

        if (!projData.project) {
          setError("Project not found");
          setLoading(false);
          return;
        }

        setProject(projData.project);
        setRole(projData.role);

        setEditForm({
          name: projData.project.name || "",
          description: projData.project.description || "",
        });

        const tasksRes = await fetch(`/api/projects/${id}/tasks`);
        const tasksData = await tasksRes.json();

        if (tasksRes.ok) {
          setTasks(tasksData.tasks || []);
        } else {
          setTasks([]);
        }
      } catch (err) {
        console.error("Failed to load project:", err);
        setError("Could not load project");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id, router]);

  async function handleCreateTask(e) {
    e.preventDefault();
    setCreating(true);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...taskForm,
          projectId: id,
          assignee: taskForm.assignee || null,
          dueDate: taskForm.dueDate || null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setTasks((prev) => [data.task, ...prev]);

        setTaskForm({
          title: "",
          description: "",
          priority: "medium",
          assignee: "",
          dueDate: "",
        });

        setShowTaskForm(false);
      }
    } catch (err) {
      console.error("Failed to create task:", err);
    } finally {
      setCreating(false);
    }
  }

  async function handleStatusChange(taskId, newStatus) {
    setTasks((prev) =>
      prev.map((t) =>
        t._id === taskId
          ? {
              ...t,
              status: newStatus,
              updatedAt: new Date().toISOString(),
            }
          : t
      )
    );

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setTasks((prev) =>
          prev.map((t) =>
            t._id === taskId ? data.task : t
          )
        );
      }
    } catch (err) {
      console.error("Failed to update task:", err);
    }
  }

  async function handleDeleteTask(taskId) {
    setTasks((prev) =>
      prev.filter((t) => t._id !== taskId)
    );

    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  }

  async function handleAddMember(e) {
    e.preventDefault();
    setMemberError("");

    try {
      const res = await fetch(`/api/projects/${id}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: memberEmail,
          role: "member",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMemberError(
          data.error || "Could not add member"
        );
        return;
      }

      if (data.project) {
        setProject(data.project);
      }

      setMemberEmail("");
      setShowMemberForm(false);
    } catch (err) {
      console.error("Failed to add member:", err);
      setMemberError("Could not add member");
    }
  }

  async function handleRemoveMember(memberUserId) {
    try {
      const res = await fetch(`/api/projects/${id}/members`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          memberUserId,
        }),
      });

      const data = await res.json();

      if (res.ok && data.project) {
        setProject(data.project);
      }
    } catch (err) {
      console.error("Failed to remove member:", err);
    }
  }

  async function handleSaveProject(e) {
    e.preventDefault();

    setProjectError("");
    setSavingProject(true);

    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editForm),
      });

      const data = await res.json();

      if (!res.ok) {
        setProjectError(
          data.error || "Could not save changes"
        );
        return;
      }

      if (data.project) {
        setProject(data.project);
      }

      setEditingProject(false);
    } catch (err) {
      console.error("Failed to save project:", err);
      setProjectError("Could not save changes");
    } finally {
      setSavingProject(false);
    }
  }

  async function handleDeleteProject() {
    if (!project) return;

    const confirmed = window.confirm(
      `Delete "${project.name || "this project"}"? This will permanently delete the project and all its tasks. This can't be undone.`
    );

    if (!confirmed) return;

    setDeleting(true);

    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.push("/dashboard");
        return;
      }

      const data = await res.json();

      setProjectError(
        data.error || "Could not delete project"
      );
    } catch (err) {
      console.error("Failed to delete project:", err);
      setProjectError("Could not delete project");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <p className="text-sm text-ink-muted">
          Loading…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg px-6 text-center">
        <p className="text-sm text-danger">
          {error}
        </p>

        <Link
          href="/dashboard"
          className="mt-4 text-sm text-ink-muted hover:text-ink"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg px-6 text-center">
        <p className="text-sm text-danger">
          Project not found.
        </p>

        <Link
          href="/dashboard"
          className="mt-4 text-sm text-ink-muted hover:text-ink"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  const canManage =
    role === "owner" || role === "admin";

  const isOwner = role === "owner";

  const doneCount = tasks.filter(
    (t) => t?.status === "done"
  ).length;

  const progress =
    tasks.length === 0
      ? 0
      : Math.round(
          (doneCount / tasks.length) * 100
        );

  const members = Array.isArray(project.members)
    ? project.members
    : [];

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="text-lg font-semibold tracking-tight text-ink"
          >
            NOVA
          </Link>

          <span className="text-sm text-ink-muted">
            {user?.name || "User"}
          </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <Link
          href="/dashboard"
          className="text-sm text-ink-muted hover:text-ink"
        >
          ← All projects
        </Link>

        {!editingProject ? (
          <div className="mt-4 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-ink">
                {project.name || "Untitled project"}
              </h1>

              {project.description && (
                <p className="text-sm text-ink-muted mt-1 max-w-xl">
                  {project.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {canManage && (
                <button
                  onClick={() =>
                    setEditingProject(true)
                  }
                  className="border border-border text-ink text-sm font-medium px-3 py-2 hover:border-accent transition-colors"
                >
                  Edit
                </button>
              )}

              {isOwner && (
                <button
                  onClick={handleDeleteProject}
                  disabled={deleting}
                  className="border border-border text-danger text-sm font-medium px-3 py-2 hover:border-danger transition-colors disabled:opacity-60"
                >
                  {deleting
                    ? "Deleting…"
                    : "Delete"}
                </button>
              )}

              <button
                onClick={() =>
                  setShowTaskForm(!showTaskForm)
                }
                className="bg-accent text-white text-sm font-medium px-4 py-2 hover:bg-accent-hover transition-colors"
              >
                {showTaskForm
                  ? "Cancel"
                  : "New task"}
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSaveProject}
            className="mt-4 border border-border bg-surface p-5"
          >
            <div className="mb-4">
              <label className="block text-sm text-ink-muted mb-1.5">
                Project name
              </label>

              <input
                type="text"
                required
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    name: e.target.value,
                  })
                }
                className="w-full border border-border bg-bg px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm text-ink-muted mb-1.5">
                Description
              </label>

              <textarea
                value={editForm.description}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    description: e.target.value,
                  })
                }
                rows={2}
                className="w-full border border-border bg-bg px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent resize-none"
              />
            </div>

            {projectError && (
              <p className="text-sm text-danger border-l-2 border-danger pl-3 mb-4">
                {projectError}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={savingProject}
                className="bg-accent text-white text-sm font-medium px-4 py-2 hover:bg-accent-hover transition-colors disabled:opacity-60"
              >
                {savingProject
                  ? "Saving…"
                  : "Save changes"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingProject(false);

                  setEditForm({
                    name: project.name || "",
                    description:
                      project.description || "",
                  });

                  setProjectError("");
                }}
                className="border border-border text-ink text-sm font-medium px-4 py-2 hover:border-accent transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

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
            {members.map((m, index) => {
              // IMPORTANT:
              // Ignore members whose user reference is null.
              if (!m?.user) {
                return null;
              }

              const memberId = m.user._id;

              return (
                <span
                  key={memberId || `member-${index}`}
                  className="inline-flex items-center gap-2 text-xs border border-border px-2.5 py-1 text-ink-muted"
                >
                  {m.user.name || "Unknown user"}

                  <span className="text-ink-muted/70">
                    · {m.role || "member"}
                  </span>

                  {canManage &&
                    m.role !== "owner" && (
                      <button
                        onClick={() =>
                          handleRemoveMember(
                            memberId
                          )
                        }
                        className="text-danger hover:text-danger/70"
                        aria-label={`Remove ${
                          m.user.name ||
                          "user"
                        }`}
                      >
                        ×
                      </button>
                    )}
                </span>
              );
            })}
          </div>

          {canManage && (
            <button
              onClick={() =>
                setShowMemberForm(
                  !showMemberForm
                )
              }
              className="text-sm text-ink-muted hover:text-ink whitespace-nowrap"
            >
              {showMemberForm
                ? "Cancel"
                : "+ Add member"}
            </button>
          )}
        </div>

        {showMemberForm && (
          <form
            onSubmit={handleAddMember}
            className="mt-4 flex gap-2 items-start"
          >
            <input
              type="email"
              required
              value={memberEmail}
              onChange={(e) =>
                setMemberEmail(e.target.value)
              }
              placeholder="teammate@company.com"
              className="border border-border bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent flex-1 max-w-xs"
            />

            <button
              type="submit"
              className="bg-accent text-white text-sm font-medium px-4 py-2 hover:bg-accent-hover transition-colors"
            >
              Add
            </button>

            {memberError && (
              <p className="text-sm text-danger self-center">
                {memberError}
              </p>
            )}
          </form>
        )}

        {showTaskForm && (
          <form
            onSubmit={handleCreateTask}
            className="mt-6 border border-border bg-surface p-5"
          >
            <div className="mb-4">
              <label className="block text-sm text-ink-muted mb-1.5">
                Title
              </label>

              <input
                type="text"
                required
                value={taskForm.title}
                onChange={(e) =>
                  setTaskForm({
                    ...taskForm,
                    title: e.target.value,
                  })
                }
                className="w-full border border-border bg-bg px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent"
                placeholder="Design the homepage hero"
              />
            </div>

            <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-ink-muted mb-1.5">
                  Priority
                </label>

                <select
                  value={taskForm.priority}
                  onChange={(e) =>
                    setTaskForm({
                      ...taskForm,
                      priority:
                        e.target.value,
                    })
                  }
                  className="w-full border border-border bg-bg px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent"
                >
                  <option value="low">
                    Low
                  </option>
                  <option value="medium">
                    Medium
                  </option>
                  <option value="high">
                    High
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-ink-muted mb-1.5">
                  Assignee
                </label>

                <select
                  value={taskForm.assignee}
                  onChange={(e) =>
                    setTaskForm({
                      ...taskForm,
                      assignee:
                        e.target.value,
                    })
                  }
                  className="w-full border border-border bg-bg px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent"
                >
                  <option value="">
                    Unassigned
                  </option>

                  {members.map((m, index) => {
                    if (!m?.user) {
                      return null;
                    }

                    return (
                      <option
                        key={
                          m.user._id ||
                          `user-${index}`
                        }
                        value={m.user._id}
                      >
                        {m.user.name ||
                          "Unknown user"}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-sm text-ink-muted mb-1.5">
                  Due date
                </label>

                <input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) =>
                    setTaskForm({
                      ...taskForm,
                      dueDate:
                        e.target.value,
                    })
                  }
                  className="w-full border border-border bg-bg px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={creating}
              className="bg-accent text-white text-sm font-medium px-4 py-2 hover:bg-accent-hover transition-colors disabled:opacity-60"
            >
              {creating
                ? "Adding…"
                : "Add task"}
            </button>
          </form>
        )}

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
          {COLUMNS.map((col) => {
            const columnTasks = tasks.filter(
              (t) =>
                t?.status === col.key
            );

            return (
              <div key={col.key}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-ink">
                    {col.label}
                  </h3>

                  <span className="text-xs text-ink-muted">
                    {columnTasks.length}
                  </span>
                </div>

                <div className="space-y-2 min-h-[80px]">
                  {columnTasks.map((task) => (
                    <div
                      key={task._id}
                      className={`border border-border border-l-2 ${
                        PRIORITY_COLOR[
                          task.priority
                        ] ||
                        PRIORITY_COLOR.medium
                      } bg-surface p-3`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-ink">
                          {task.title ||
                            "Untitled task"}
                        </p>

                        <button
                          onClick={() =>
                            handleDeleteTask(
                              task._id
                            )
                          }
                          className="text-ink-muted hover:text-danger text-xs shrink-0"
                          aria-label="Delete task"
                        >
                          ×
                        </button>
                      </div>

                      <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-2">
                        {task.assignee?.name && (
                          <p className="text-xs text-ink-muted">
                            {task.assignee.name}
                          </p>
                        )}

                        {task.dueDate && (
                          <p
                            className={`text-xs ${
                              isOverdue(task)
                                ? "text-danger"
                                : "text-ink-muted"
                            }`}
                          >
                            Due{" "}
                            {formatDueDate(
                              task.dueDate
                            )}
                          </p>
                        )}
                      </div>

                      <p className="text-[11px] text-ink-muted/70 mt-1.5">
                        Updated{" "}
                        {timeAgo(
                          task.updatedAt
                        )}
                      </p>

                      <select
                        value={
                          task.status || "todo"
                        }
                        onChange={(e) =>
                          handleStatusChange(
                            task._id,
                            e.target.value
                          )
                        }
                        className="mt-3 w-full text-xs border border-border bg-bg px-2 py-1 text-ink-muted focus:outline-none focus:border-accent"
                      >
                        {COLUMNS.map((c) => (
                          <option
                            key={c.key}
                            value={c.key}
                          >
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}

                  {columnTasks.length === 0 && (
                    <div className="border border-dashed border-border py-6 text-center">
                      <p className="text-xs text-ink-muted">
                        Empty
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}