import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Project from "@/models/Project";
import User from "@/models/User";
import { getCurrentUserId } from "@/lib/auth";

export async function POST(request, { params }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const { email, role } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    await dbConnect();

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const requester = project.members.find((m) => m.user.toString() === userId);
    if (!requester || (requester.role !== "owner" && requester.role !== "admin")) {
      return NextResponse.json({ error: "Only owners and admins can add members" }, { status: 403 });
    }

    const userToAdd = await User.findOne({ email: email.toLowerCase() });
    if (!userToAdd) {
      return NextResponse.json({ error: "No user found with that email" }, { status: 404 });
    }

    const alreadyMember = project.members.some((m) => m.user.toString() === userToAdd._id.toString());
    if (alreadyMember) {
      return NextResponse.json({ error: "This user is already a member" }, { status: 409 });
    }

    project.members.push({ user: userToAdd._id, role: role || "member" });
    await project.save();

    const populated = await Project.findById(id)
      .populate("owner", "name email")
      .populate("members.user", "name email");

    return NextResponse.json({ project: populated });
  } catch (err) {
    console.error("Add member error:", err);
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
    const { memberUserId } = await request.json();

    await dbConnect();

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const requester = project.members.find((m) => m.user.toString() === userId);
    if (!requester || (requester.role !== "owner" && requester.role !== "admin")) {
      return NextResponse.json({ error: "Only owners and admins can remove members" }, { status: 403 });
    }

    if (project.owner.toString() === memberUserId) {
      return NextResponse.json({ error: "Cannot remove the project owner" }, { status: 400 });
    }

    project.members = project.members.filter((m) => m.user.toString() !== memberUserId);
    await project.save();

    const populated = await Project.findById(id)
      .populate("owner", "name email")
      .populate("members.user", "name email");

    return NextResponse.json({ project: populated });
  } catch (err) {
    console.error("Remove member error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}