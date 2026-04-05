import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error(
    jwtSecret
      ? `JWT_SECRET must be at least 32 characters (current: ${jwtSecret.length})`
      : "Missing required environment variable: JWT_SECRET"
  );
}
const secret = new TextEncoder().encode(jwtSecret);

export interface TokenPayload extends JWTPayload {
  userId: string;
  role: string;
  preferredLocale: string;
}

export async function signToken(payload: Omit<TokenPayload, keyof JWTPayload>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secret);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as TokenPayload;
  } catch {
    return null;
  }
}
