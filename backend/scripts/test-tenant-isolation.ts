/**
 * Runnable tenant-isolation smoke/integration checks (requires DB access).
 * Usage: cd backend && npx ts-node --transpile-only scripts/test-tenant-isolation.ts
 *
 * This is a starting point for automated isolation tests (not wired into `npm test`
 * to avoid requiring a live DB in unit-test runs). Expand with fixtures/cleanup as needed.
 */
import "dotenv/config";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { runWithTenantContext } from "../src/lib/tenantContext";
import { tenantMiddleware } from "../src/lib/tenantMiddleware";

const prisma = new PrismaClient();
prisma.$use(tenantMiddleware());

async function main() {
  const tenants = await runWithTenantContext({ bypassTenantScope: true }, async () =>
    prisma.tenant.findMany({ select: { id: true, slug: true }, take: 2, orderBy: { createdAt: "asc" } }),
  );
  if (tenants.length < 2) {
    console.log("SKIP: need >=2 tenants to verify isolation");
    return;
  }
  const [a, b] = tenants;
  console.log(`Checking isolation between ${a.slug} (${a.id}) and ${b.slug} (${b.id})`);

  // Users visible in tenant A context must all belong to A
  const usersA = await runWithTenantContext({ tenantId: a.id }, async () =>
    prisma.user.findMany({ select: { id: true, tenantId: true }, take: 50 }),
  );
  for (const u of usersA) assert.equal(u.tenantId, a.id, `user ${u.id} leaked outside tenant A`);

  // Users visible in tenant B context must all belong to B
  const usersB = await runWithTenantContext({ tenantId: b.id }, async () =>
    prisma.user.findMany({ select: { id: true, tenantId: true }, take: 50 }),
  );
  for (const u of usersB) assert.equal(u.tenantId, b.id, `user ${u.id} leaked outside tenant B`);

  // Cross-tenant lookup by id from A context should not return B's users
  if (usersB[0]) {
    const leak = await runWithTenantContext({ tenantId: a.id }, async () =>
      prisma.user.findFirst({ where: { id: usersB[0].id }, select: { id: true } }),
    );
    assert.equal(leak, null, "cross-tenant user lookup must not resolve");
  }

  // Missing tenant context must fail closed for scoped models
  let failedClosed = false;
  try {
    await prisma.user.findMany({ take: 1 });
  } catch (e: any) {
    failedClosed = String(e?.message || "").includes("TENANT_SCOPE_REQUIRED");
  }
  assert.equal(failedClosed, true, "scoped query without tenant context must fail closed");

  console.log("PASS: tenant isolation smoke checks");
}

main()
  .catch((e) => {
    console.error("FAIL", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
