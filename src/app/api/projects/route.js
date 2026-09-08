import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Project from "@/models/Project";
import { getCurrentUserId } from "@/lib/auth";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    await dbConnect();

    const projects = await Project.find({
      $or: [{ owner: userId }, { "members.user": userId }],
    })
      .populate("owner", "name email")
      .populate("members.user", "name email")
      .sort({ createdAt: -1 });

    return NextResponse.json({ projects });
  } catch (err) {
    console.error("Get projects error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { name, description } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Project name is required" }, { status: 400 });
    }

    await dbConnect();

    const project = await Project.create({
      name: name.trim(),
      description: description?.trim() || "",
      owner: userId,
      members: [{ user: userId, role: "owner" }],
    });

    const populated = await Project.findById(project._id)
      .populate("owner", "name email")
      .populate("members.user", "name email");

    return NextResponse.json({ project: populated }, { status: 201 });
  } catch (err) {
    console.error("Create project error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}