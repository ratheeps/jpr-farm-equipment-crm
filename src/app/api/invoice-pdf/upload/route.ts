import { NextRequest, NextResponse } from "next/server";
import { requireSession, isRole } from "@/lib/auth/session";
import { createRateLimiter } from "@/lib/rate-limit";
import { uploadBuffer, getPresignedDownloadUrl } from "@/lib/storage";
import { randomUUID } from "crypto";

const checkUploadRate = createRateLimiter(60_000, 10);

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { allowed, retryAfterMs } = checkUploadRate(session.userId);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many uploads" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const invoiceId = formData.get("invoiceId") as string | null;

  if (!file || !invoiceId) {
    return NextResponse.json({ error: "Missing file or invoiceId" }, { status: 400 });
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files allowed" }, { status: 400 });
  }

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = `invoice-pdfs/${invoiceId}/${randomUUID()}.pdf`;

  await uploadBuffer(key, buffer, "application/pdf");
  const downloadUrl = await getPresignedDownloadUrl(key);

  return NextResponse.json({ url: downloadUrl });
}
