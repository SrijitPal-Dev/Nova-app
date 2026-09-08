import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Task from "@/models/Task";
import Project from "@/models/Project";
import { getCurrentUserId } from "@/lib/auth";

async function checkAccess(taskId, userId) {
  const task = await Task.findById(taskId);
  if (!task) return { task: null, allowed: false };

  const project = await Project.findById(task.project);
  const isMember = project?.members.some((m) => m.user.toString() === userId);

  return { task, allowed: !!isMember };
}

export async function PATCH(request, { params }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const updates = await request.json();

    await dbConnect();

    const { task, allowed } = await checkAccess(id, userId);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    if (!allowed) {
      return NextResponse.json({ error: "You don't have access to this task" }, { status: 403 });
    }

    const allowedFields = ["title", "description", "status", "priority", "assignee", "dueDate"];
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        task[field] = updates[field];
      }
    }

    await task.save();

    const populated = await Task.findById(id).populate("assignee", "name email");

    return NextResponse.json({ task: populated });
  } catch (err) {
    console.error("Update task error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;

    await dbConnect();

    const { task, allowed } = await checkAccess(id, userId);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    if (!allowed) {
      return NextResponse.json({ error: "You don't have access to this task" }, { status: 403 });
    }

    await Task.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete task error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}