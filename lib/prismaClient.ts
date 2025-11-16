import { PrismaClient } from "@prisma/client";

const prismaLogLevels: Array<"query" | "warn" | "error"> =
  process.env.NODE_ENV === "development"
    ? ["query", "warn", "error"]
    : ["warn", "error"];

const globalForPrisma = globalThis as unknown as {
  prismaClientGlobal?: PrismaClient;
};

export const prismaClient =
  globalForPrisma.prismaClientGlobal ??
  new PrismaClient({
    log: prismaLogLevels,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaClientGlobal = prismaClient;
}
