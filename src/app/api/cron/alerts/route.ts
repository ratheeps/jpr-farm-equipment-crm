import { NextRequest, NextResponse } from "next/server";
import { scanAndPersistAlerts, sendCriticalPushes, sendDailyDigest } from "@/lib/actions/alerts";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mode = request.nextUrl.searchParams.get("mode");

  if (mode === "scan") {
    await scanAndPersistAlerts();
    await sendCriticalPushes();
    return NextResponse.json({ ok: true, mode: "scan" });
  }

  if (mode === "digest") {
    await sendDailyDigest();
    return NextResponse.json({ ok: true, mode: "digest" });
  }

  return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
}
