import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Task from "@/models/Task";
import Project from "@/models/Project";
import { getCurrentUserId } from "@/lib/auth";

export async function POST(request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { title, description, projectId, priority, assignee, dueDate } = await request.json();

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Task title is required" }, { status: 400 });
    }
    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    await dbConnect();

    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const isMember = project.members.some((m) => m.user.toString() === userId);
    if (!isMember) {
      return NextResponse.json({ error: "You don't have access to this project" }, { status: 403 });
    }

    const task = await Task.create({
      title: title.trim(),
      description: description?.trim() || "",
      project: projectId,
      priority: priority || "medium",
      assignee: assignee || null,
      dueDate: dueDate || null,
    });

    const populated = await Task.findById(task._id).populate("assignee", "name email");

    return NextResponse.json({ task: populated }, { status: 201 });
  } catch (err) {
    console.error("Create task error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}