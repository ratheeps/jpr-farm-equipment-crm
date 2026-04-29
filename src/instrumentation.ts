export async function register() {
  // Hard skip during build — Next 15 invokes register() during page-data collection.
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertRlsPosture } = await import("@/db/assert-rls-posture");
    await assertRlsPosture();
  }
}
