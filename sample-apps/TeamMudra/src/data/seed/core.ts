import type { PrismaClient } from "../../generated/prisma/client.js";
import { at, LOCATION_IDS, ORGANIZATION_ID } from "./constants.js";
import type { CoreSeedResult } from "./types.js";

const locations = [
  [LOCATION_IDS.central, "CMS", "Central Medical Store", "WAREHOUSE"],
  [LOCATION_IDS.pharmacy, "PHA", "Main Pharmacy", "PHARMACY"],
  [LOCATION_IDS.emergency, "ED", "Emergency Department", "CLINICAL"],
  [LOCATION_IDS.icu, "ICU", "Intensive Care Unit", "CLINICAL"],
  [LOCATION_IDS.wardA, "GWA", "General Ward A", "CLINICAL"],
  [LOCATION_IDS.wardB, "GWB", "General Ward B", "CLINICAL"],
  [LOCATION_IDS.theatre, "OT", "Operating Theatre", "CLINICAL"],
  [LOCATION_IDS.outpatient, "OPD", "Outpatient Department", "CLINICAL"],
  [LOCATION_IDS.laboratory, "LAB", "Diagnostic Laboratory", "DIAGNOSTIC"],
  [LOCATION_IDS.biomedical, "BIO", "Biomedical Store", "ENGINEERING"],
  [LOCATION_IDS.linen, "LIN", "Linen and Laundry Store", "LOGISTICS"],
  [LOCATION_IDS.gas, "GAS", "Medical Gas Store", "LOGISTICS"],
] as const;

const roles = [
  ["role-01", "INVENTORY_OFFICER", "Inventory Officer", 200_000],
  ["role-02", "PHARMACY_MANAGER", "Pharmacy Manager", 500_000],
  ["role-03", "PROCUREMENT_OFFICER", "Procurement Officer", 1_000_000],
  ["role-04", "FINANCE_APPROVER", "Finance Approver", 5_000_000],
  ["role-05", "COMPLIANCE_OFFICER", "Compliance Officer", 1_000_000],
  ["role-06", "OPERATIONS_ADMIN", "Operations Administrator", 10_000_000],
] as const;

export async function seedCore(client: PrismaClient): Promise<CoreSeedResult> {
  await client.organization.upsert({
    where: { id: ORGANIZATION_ID },
    create: {
      id: ORGANIZATION_ID,
      code: "CFH-001",
      name: "CareFlow Meridian Hospital",
      legalName: "CareFlow Meridian Health Services Foundation",
      timezone: "Asia/Kolkata",
      currency: "INR",
      createdAt: at(-400),
    },
    update: {
      name: "CareFlow Meridian Hospital",
      legalName: "CareFlow Meridian Health Services Foundation",
      timezone: "Asia/Kolkata",
      currency: "INR",
    },
  });

  for (const [id, code, name, locationType] of locations) {
    await client.location.upsert({
      where: { id },
      create: {
        id,
        organizationId: ORGANIZATION_ID,
        code: `CFH-${code}`,
        name,
        locationType,
        addressLine: `${10 + Number(id.slice(-2))} Fictional Health Campus Road`,
        city: "Navanagar",
        state: "Karnataka",
        postalCode: `560${String(100 + Number(id.slice(-2))).slice(-3)}`,
        active: true,
        createdAt: at(-365),
      },
      update: { name, locationType, active: true },
    });
  }

  for (const [id, code, name, approvalLimitPaise] of roles) {
    await client.role.upsert({
      where: { id },
      create: {
        id,
        organizationId: ORGANIZATION_ID,
        code,
        name,
        description: `${name} role for the synthetic CareFlow demonstration`,
        approvalLimitPaise,
      },
      update: { name, approvalLimitPaise },
    });
  }

  const userIds: string[] = [];
  for (let index = 1; index <= 15; index += 1) {
    const id = `user-${String(index).padStart(2, "0")}`;
    userIds.push(id);
    await client.user.upsert({
      where: { id },
      create: {
        id,
        organizationId: ORGANIZATION_ID,
        employeeCode: `CFU-${String(index).padStart(3, "0")}`,
        displayName: `CareFlow Team Member ${String(index).padStart(2, "0")}`,
        email: `team.member${String(index).padStart(2, "0")}@careflow.example.invalid`,
        active: true,
      },
      update: { active: true },
    });
    const roleId = roles[(index - 1) % roles.length][0];
    const locationId = locations[(index - 1) % locations.length][0];
    await client.userAssignment.upsert({
      where: { id: `assignment-${String(index).padStart(2, "0")}` },
      create: {
        id: `assignment-${String(index).padStart(2, "0")}`,
        userId: id,
        roleId,
        locationId,
        primary: true,
      },
      update: { roleId, locationId, primary: true },
    });
  }

  return {
    organizationId: ORGANIZATION_ID,
    locationIds: locations.map(([id]) => id),
    roleIds: roles.map(([id]) => id),
    userIds,
  };
}
