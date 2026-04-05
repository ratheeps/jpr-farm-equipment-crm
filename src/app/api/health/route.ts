import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export async function GET() {
  let dbOk = false;
  try {
    await db.execute(sql`SELECT 1`);
    dbOk = true;
  } catch {
    // db unreachable
  }

  const status = dbOk ? "ok" : "degraded";
  return NextResponse.json(
    { status, db: dbOk, timestamp: new Date().toISOString() },
    { status: dbOk ? 200 : 503 }
  );
}
