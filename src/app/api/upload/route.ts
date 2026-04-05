import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { validateCsrf } from "@/lib/csrf";
import { getPresignedUploadUrl, getPublicUrl } from "@/lib/storage";
import path from "path";

const ALLOWED_MIME_PREFIXES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/gif"];
const MAX_FILENAME_LENGTH = 200;

function sanitizeFilename(raw: string): string {
  // Keep only the basename, strip directory traversal
  const base = path.basename(raw);
  // Replace characters that aren't alphanumeric, dash, underscore, or dot
  return base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, MAX_FILENAME_LENGTH);
}

export async function POST(request: NextRequest) {
  const csrfError = validateCsrf(request);
  if (csrfError) return csrfError;

  const session = await requireSession();

  const body = (await request.json()) as { filename?: string; contentType?: string };

  if (!body.filename || !body.contentType) {
    return NextResponse.json({ error: "filename and contentType are required" }, { status: 400 });
  }

  const isImageType = ALLOWED_MIME_PREFIXES.some((t) => body.contentType!.startsWith(t));
  if (!isImageType) {
    return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
  }

  const safeFilename = sanitizeFilename(body.filename);
  const key = `receipts/${session.userId}/${Date.now()}-${safeFilename}`;

  const uploadUrl = await getPresignedUploadUrl(key, body.contentType);
  const fileUrl = getPublicUrl(key);

  return NextResponse.json({ uploadUrl, fileUrl });
}
