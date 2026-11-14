import { PrismaClient } from "@prisma/client";
import { tenantMiddleware } from "./tenantMiddleware";

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

prisma.$use(tenantMiddleware());
