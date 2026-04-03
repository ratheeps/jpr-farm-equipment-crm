"use server";

import { db } from "@/db";
import { projects, projectAssignments, vehicles, staffProfiles } from "@/db/schema";
import { requireSession, isRole } from "@/lib/auth/session";
import { eq, and, desc, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type ProjectFormData = {
  name: string;
  clientName: string;
  clientPhone?: string;
  siteLocationText?: string;
  status: string;
  estimatedHours?: string;
  estimatedCost?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
};

export async function createProject(data: ProjectFormData) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }

  await db.insert(projects).values({
    name: data.name,
    clientName: data.clientName,
    clientPhone: data.clientPhone || null,
    siteLocationText: data.siteLocationText || null,
    status: data.status as never,
    estimatedHours: data.estimatedHours || null,
    estimatedCost: data.estimatedCost || null,
    startDate: data.startDate || null,
    endDate: data.endDate || null,
    notes: data.notes || null,
  });

  revalidatePath("/admin/projects");
  revalidatePath("/owner");
}

export async function updateProject(id: string, data: ProjectFormData) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }

  await db
    .update(projects)
    .set({
      name: data.name,
      clientName: data.clientName,
      clientPhone: data.clientPhone || null,
      siteLocationText: data.siteLocationText || null,
      status: data.status as never,
      estimatedHours: data.estimatedHours || null,
      estimatedCost: data.estimatedCost || null,
      startDate: data.startDate || null,
      endDate: data.endDate || null,
      notes: data.notes || null,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, id));

  revalidatePath("/admin/projects");
  revalidatePath(`/admin/projects/${id}`);
}

export async function deleteProject(id: string) {
  const session = await requireSession();
  if (!isRole(session, "super_admin")) {
    throw new Error("Forbidden");
  }

  await db.update(projects).set({ status: "completed" }).where(eq(projects.id, id));
  revalidatePath("/admin/projects");
}

export async function getProjects() {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin", "auditor")) {
    throw new Error("Forbidden");
  }

  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      clientName: projects.clientName,
      clientPhone: projects.clientPhone,
      siteLocationText: projects.siteLocationText,
      status: projects.status,
      estimatedHours: projects.estimatedHours,
      estimatedCost: projects.estimatedCost,
      startDate: projects.startDate,
      endDate: projects.endDate,
      notes: projects.notes,
      createdAt: projects.createdAt,
      assignmentCount: count(projectAssignments.id),
    })
    .from(projects)
    .leftJoin(
      projectAssignments,
      and(
        eq(projectAssignments.projectId, projects.id),
        eq(projectAssignments.isActive, true)
      )
    )
    .groupBy(projects.id)
    .orderBy(desc(projects.createdAt));

  return rows;
}

export async function getProject(id: string) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin", "auditor")) {
    throw new Error("Forbidden");
  }

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id));

  if (!project) return null;

  const assignments = await db
    .select({
      id: projectAssignments.id,
      vehicleId: projectAssignments.vehicleId,
      vehicleName: vehicles.name,
      staffId: projectAssignments.staffId,
      staffName: staffProfiles.fullName,
      assignedFrom: projectAssignments.assignedFrom,
      assignedTo: projectAssignments.assignedTo,
    })
    .from(projectAssignments)
    .leftJoin(vehicles, eq(projectAssignments.vehicleId, vehicles.id))
    .leftJoin(staffProfiles, eq(projectAssignments.staffId, staffProfiles.id))
    .where(
      and(
        eq(projectAssignments.projectId, id),
        eq(projectAssignments.isActive, true)
      )
    );

  return { project, assignments };
}

export async function assignToProject(data: {
  projectId: string;
  vehicleId?: string;
  staffId?: string;
  assignedFrom?: string;
  assignedTo?: string;
}) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }

  if (!data.vehicleId && !data.staffId) {
    throw new Error("Must provide vehicleId or staffId");
  }

  await db.insert(projectAssignments).values({
    projectId: data.projectId,
    vehicleId: data.vehicleId || null,
    staffId: data.staffId || null,
    assignedFrom: data.assignedFrom || null,
    assignedTo: data.assignedTo || null,
    isActive: true,
  });

  revalidatePath(`/admin/projects/${data.projectId}`);
}

export async function removeAssignment(assignmentId: string) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }

  const [assignment] = await db
    .select({ projectId: projectAssignments.projectId })
    .from(projectAssignments)
    .where(eq(projectAssignments.id, assignmentId));

  await db
    .update(projectAssignments)
    .set({ isActive: false })
    .where(eq(projectAssignments.id, assignmentId));

  if (assignment) {
    revalidatePath(`/admin/projects/${assignment.projectId}`);
  }
}
