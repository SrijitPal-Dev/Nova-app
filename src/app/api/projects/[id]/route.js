import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Project from "@/models/Project";
import Task from "@/models/Task";
import { getCurrentUserId } from "@/lib/auth";

async function getUserRole(project, userId) {
  const member = project.members.find((m) => m.user._id.toString() === userId || m.user.toString() === userId);
  return member ? member.role : null;
}

export async function GET(request, { params }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;

    await dbConnect();

    const project = await Project.findById(id)
      .populate("owner", "name email")
      .populate("members.user", "name email");

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const role = await getUserRole(project, userId);
    if (!role) {
      return NextResponse.json({ error: "You don't have access to this project" }, { status: 403 });
    }

    return NextResponse.json({ project, role });
  } catch (err) {
    console.error("Get project error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const { name, description } = await request.json();

    await dbConnect();

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const role = await getUserRole(project, userId);
    if (role !== "owner" && role !== "admin") {
      return NextResponse.json({ error: "Only owners and admins can edit this project" }, { status: 403 });
    }

    if (name !== undefined) project.name = name.trim();
    if (description !== undefined) project.description = description.trim();
    await project.save();

    const populated = await Project.findById(id)
      .populate("owner", "name email")
      .populate("members.user", "name email");

    return NextResponse.json({ project: populated });
  } catch (err) {
    console.error("Update project error:", err);
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

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.owner.toString() !== userId) {
      return NextResponse.json({ error: "Only the owner can delete this project" }, { status: 403 });
    }

    await Task.deleteMany({ project: id });
    await Project.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete project error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}