import { Topbar } from "@/components/layout/topbar";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getLeaves } from "@/lib/actions/leaves";
import { LeaveListCard } from "@/components/staff/leave-list-card";

export default async function StaffLeavesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);
  if (!["super_admin", "admin"].includes(session.role)) {
    redirect(`/${locale}/operator`);
  }

  const allLeaves = await getLeaves();
  const pending = allLeaves.filter((l) => l.status === "pending");
  const others = allLeaves.filter((l) => l.status !== "pending");

  const canApprove = ["super_admin", "admin"].includes(session.role);

  return (
    <div>
      <Topbar title="Leave Requests" showBack />
      <div className="px-4 py-4 space-y-6">
        {allLeaves.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-12">
            No leave requests yet
          </p>
        )}

        {pending.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Pending ({pending.length})
            </p>
            <div className="space-y-3">
              {pending.map((l) => (
                <LeaveListCard key={l.id} leave={l as never} canApprove={canApprove} />
              ))}
            </div>
          </div>
        )}

        {others.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Past Requests
            </p>
            <div className="space-y-3">
              {others.map((l) => (
                <LeaveListCard key={l.id} leave={l as never} canApprove={false} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
