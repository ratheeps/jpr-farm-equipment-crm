import { cookies } from "next/headers";
import { verifyToken, type TokenPayload } from "./jwt";

export const COOKIE_NAME = "jpr_session";

export async function getSession(): Promise<TokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireSession(): Promise<TokenPayload> {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

export function isRole(
  session: TokenPayload,
  ...roles: string[]
): boolean {
  return roles.includes(session.role);
}
