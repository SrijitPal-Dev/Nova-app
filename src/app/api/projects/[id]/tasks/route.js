import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Task from "@/models/Task";
import Project from "@/models/Project";
import { getCurrentUserId } from "@/lib/auth";

export async function GET(request, { params }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;

    await dbConnect();

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const isMember = project.members.some((m) => m.user.toString() === userId);
    if (!isMember) {
      return NextResponse.json({ error: "You don't have access to this project" }, { status: 403 });
    }

    const tasks = await Task.find({ project: id })
      .populate("assignee", "name email")
      .sort({ createdAt: -1 });

    return NextResponse.json({ tasks });
  } catch (err) {
    console.error("Get tasks error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}