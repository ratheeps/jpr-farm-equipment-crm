/**
 * Development seed script — creates initial super_admin user and sample vehicles.
 * Run with: npx tsx src/db/seed.ts
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { hashPassword } from "../lib/auth/password";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const db = drizzle(pool, { schema });

async function seed() {
  console.log("Seeding database...");

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

  if (admin) {
    await db
      .insert(schema.staffProfiles)
      .values({
        userId: admin.id,
        fullName: "Admin User",
        phone: "0778180297",
        payType: "monthly",
      })
      .onConflictDoNothing();
    console.log("✓ Super admin created: 0779361019 / admin123");
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
        fuelConsumptionBaseline: "0.12",
        maintenanceIntervalHours: 300,
        currentEngineHours: "2100",
        status: "active",
      },
    ])
    .onConflictDoNothing();
  console.log("✓ Sample vehicles created");

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
