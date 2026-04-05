import { Topbar } from "@/components/layout/topbar";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getLeaves } from "@/lib/actions/leaves";
import { LeaveForm } from "@/components/forms/leave-form";
import { LeaveListCard } from "@/components/staff/leave-list-card";

export default async function OperatorLeavePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);

  const leaves = await getLeaves();

  return (
    <div>
      <Topbar title="Leave Requests" showBack />
      <div className="px-4 py-4 space-y-6">
        <LeaveForm />

        {leaves.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              My Requests
            </p>
            <div className="space-y-3">
              {leaves.map((l) => (
                <LeaveListCard key={l.id} leave={l as never} canApprove={false} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
