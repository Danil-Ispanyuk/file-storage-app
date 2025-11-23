#!/usr/bin/env tsx

/**
 * Скрипт для перерахунку usedStorage для всіх користувачів
 * Використовується для виправлення невідповідностей після додавання функціоналу storage quota
 *
 * Використання:
 *   npm run recalculate-storage
 *   npm run recalculate-storage -- --userId <userId>
 */

import { PrismaClient } from "@prisma/client";
import { recalculateUserStorage } from "../lib/storageQuota";

const prisma = new PrismaClient();

async function recalculateAllUsers() {
  console.log("🔄 Starting storage recalculation...");

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      usedStorage: true,
    },
  });

  console.log(`Found ${users.length} users`);

  for (const user of users) {
    try {
      const actualUsed = await recalculateUserStorage(user.id);
      const oldUsed = user.usedStorage || 0;
      const difference = actualUsed - oldUsed;

      if (difference !== 0) {
        console.log(
          `✅ ${user.email}: ${formatBytes(oldUsed)} → ${formatBytes(actualUsed)} (${difference > 0 ? "+" : ""}${formatBytes(difference)})`,
        );
      } else {
        console.log(`✓ ${user.email}: ${formatBytes(actualUsed)} (unchanged)`);
      }
    } catch (error) {
      console.error(`❌ Error recalculating for ${user.email}:`, error);
    }
  }

  console.log("✅ Storage recalculation completed!");
}

async function recalculateSingleUser(userId: string) {
  console.log(`🔄 Recalculating storage for user: ${userId}`);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      usedStorage: true,
    },
  });

  if (!user) {
    console.error(`❌ User with ID ${userId} not found`);
    process.exit(1);
  }

  try {
    const oldUsed = user.usedStorage || 0;
    const actualUsed = await recalculateUserStorage(user.id);
    const difference = actualUsed - oldUsed;

    console.log(`Old used storage: ${formatBytes(oldUsed)}`);
    console.log(`New used storage: ${formatBytes(actualUsed)}`);
    if (difference !== 0) {
      console.log(
        `Difference: ${difference > 0 ? "+" : ""}${formatBytes(difference)}`,
      );
    } else {
      console.log("No change needed");
    }
  } catch (error) {
    console.error("❌ Error recalculating storage:", error);
    process.exit(1);
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

// Parse command line arguments
const args = process.argv.slice(2);
const userIdIndex = args.indexOf("--userId");
const userId =
  userIdIndex >= 0 && args[userIdIndex + 1] ? args[userIdIndex + 1] : null;

// Run
(async () => {
  try {
    if (userId) {
      await recalculateSingleUser(userId);
    } else {
      await recalculateAllUsers();
    }
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
