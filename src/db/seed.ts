/**
 * Development seed script — creates initial super_admin user and sample vehicles.
 * Run with: npx tsx src/db/seed.ts
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { hashPassword } from "../lib/auth/password";

const databaseUrl =
  process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "Missing MIGRATION_DATABASE_URL or DATABASE_URL for seeding"
  );
}

const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle(pool, { schema });

async function seed() {
  console.log("Seeding database...");

  // System user — drives cron/background paths under withSystemRLS.
  // Login is blocked at the handler (see src/lib/auth/system-user.ts) AND by
  // isActive=false. The passwordHash sentinel "!disabled" is checked by isLoginDisabled.
  const SYSTEM_PHONE = "system@internal";
  const SYSTEM_PASSWORD_HASH = "!disabled";

  const existingSystem = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.phone, SYSTEM_PHONE))
    .limit(1);

  let systemUserId: string;
  if (existingSystem.length === 0) {
    const inserted = await db
      .insert(schema.users)
      .values({
        phone: SYSTEM_PHONE,
        passwordHash: SYSTEM_PASSWORD_HASH,
        role: "super_admin",
        preferredLocale: "en",
        isActive: false,
      })
      .returning({ id: schema.users.id });
    systemUserId = inserted[0].id;
    console.log(`✓ System user created: ${systemUserId}`);
  } else {
    systemUserId = existingSystem[0].id;
    console.log(`✓ System user exists: ${systemUserId}`);
  }
  console.log(`Set SYSTEM_USER_ID=${systemUserId} in your .env (required for cron in production)`);

  // Super Admin user
  const passwordHash = await hashPassword("admin123");
  const [admin] = await db
    .insert(schema.users)
    .values({
      phone: "0779361019",
      passwordHash,
      role: "super_admin",
      preferredLocale: "ta",
    })
    .onConflictDoNothing()
    .returning({ id: schema.users.id });

  let adminStaffId: string | undefined;
  if (admin) {
    const [adminStaff] = await db
      .insert(schema.staffProfiles)
      .values({
        userId: admin.id,
        fullName: "Admin User",
        phone: "0778180297",
        payType: "monthly",
      })
      .onConflictDoNothing()
      .returning({ id: schema.staffProfiles.id });
    adminStaffId = adminStaff?.id;
    console.log("✓ Super admin created: 0779361019 / admin123");
  } else {
    // Admin already exists — fetch existing staff profile id
    const existing = await db
      .select({ id: schema.staffProfiles.id })
      .from(schema.staffProfiles)
      .innerJoin(schema.users, eq(schema.users.id, schema.staffProfiles.userId))
      .where(eq(schema.users.phone, "0779361019"))
      .limit(1);
    adminStaffId = existing[0]?.id;
  }

  // Sample vehicles
  await db
    .insert(schema.vehicles)
    .values([
      {
        name: "Excavator CAT 320",
        registrationNumber: "WP-CAT-001",
        vehicleType: "excavator",
        billingModel: "hourly",
        ratePerHour: "8500",
        operatorRatePerUnit: "700",
        fuelConsumptionBaseline: "18",
        maintenanceIntervalHours: 250,
        currentEngineHours: "1240",
        status: "active",
      },
      {
        name: "Bulldozer D6R",
        registrationNumber: "WP-BUL-001",
        vehicleType: "bulldozer",
        billingModel: "hourly",
        ratePerHour: "9500",
        operatorRatePerUnit: "750",
        fuelConsumptionBaseline: "22",
        maintenanceIntervalHours: 250,
        currentEngineHours: "890",
        status: "active",
      },
      {
        name: "Harvester Yanmar",
        registrationNumber: "NW-HAR-001",
        vehicleType: "harvester",
        billingModel: "per_acre",
        ratePerAcre: "3500",
        operatorRatePerUnit: "300",
        fuelConsumptionBaseline: "8",
        maintenanceIntervalHours: 200,
        currentEngineHours: "450",
        status: "active",
      },
      {
        name: "Lorry Isuzu NKR",
        registrationNumber: "NW-LOR-001",
        vehicleType: "transport_truck",
        billingModel: "per_km",
        ratePerKm: "120",
        operatorRatePerUnit: "10",
        tripAllowance: "500",
        fuelConsumptionBaseline: "0.12",
        maintenanceIntervalHours: 300,
        currentEngineHours: "2100",
        status: "active",
      },
    ])
    .onConflictDoNothing();
  console.log("✓ Sample vehicles created");

  // Sample project with mobilization fee
  const [project] = await db
    .insert(schema.projects)
    .values({
      name: "Paddy Land Development — Anuradhapura",
      clientName: "K. Ratnasingham",
      clientPhone: "0712345678",
      mobilizationFee: "25000",
      status: "active",
    })
    .onConflictDoNothing()
    .returning({ id: schema.projects.id });
  console.log("✓ Sample project created");

  // Sample daily log with tripAllowanceOverride (uses Lorry vehicle)
  if (project && adminStaffId) {
    const lorry = await db
      .select({ id: schema.vehicles.id })
      .from(schema.vehicles)
      .where(eq(schema.vehicles.registrationNumber, "NW-LOR-001"))
      .limit(1);

    if (lorry[0]) {
      await db
        .insert(schema.dailyLogs)
        .values({
          projectId: project.id,
          vehicleId: lorry[0].id,
          operatorId: adminStaffId,
          date: "2026-04-01",
          startEngineHours: "2100",
          endEngineHours: "2108",
          kmTraveled: "45",
          tripAllowanceOverride: "750",
          syncStatus: "synced",
        })
        .onConflictDoNothing();
      console.log("✓ Sample daily log with tripAllowanceOverride created");
    }
  }

  // Company settings
  await db
    .insert(schema.companySettings)
    .values({
      companyName: "JPR BROTHERS CONSTRUCTION (PVT) LTD",
    })
    .onConflictDoNothing();
  console.log("✓ Company settings created");

  console.log("Seed complete.");
  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
