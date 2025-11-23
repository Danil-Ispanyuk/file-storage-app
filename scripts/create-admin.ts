#!/usr/bin/env tsx

/**
 * CLI скрипт для створення адміністратора
 *
 * Використання:
 *   npm run create-admin
 *   npm run create-admin -- --email admin@example.com --password SecurePass123 --name "Admin Name"
 */

import { PrismaClient, Role } from "@prisma/client";
import { hashPassword } from "../lib/passwordManager";

const prisma = new PrismaClient();

interface CreateAdminOptions {
  email: string;
  password: string;
  name?: string;
}

async function createAdmin(options: CreateAdminOptions) {
  const { email, password, name } = options;

  // Валідація email
  if (!email || !email.includes("@")) {
    console.error("❌ Invalid email address");
    process.exit(1);
  }

  // Валідація пароля
  if (!password || password.length < 8) {
    console.error("❌ Password must be at least 8 characters long");
    process.exit(1);
  }

  // Перевірити чи користувач вже існує
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.error(`❌ User with email ${email} already exists`);
    process.exit(1);
  }

  try {
    // Хешувати пароль
    const hashedPassword = await hashPassword(password);

    // Створити адміна
    const admin = await prisma.user.create({
      data: {
        email,
        name: name || "Administrator",
        password: hashedPassword,
        role: Role.ADMIN,
        emailVerified: new Date(),
        storageQuota: 1073741824, // 1GB для адміна
      },
    });

    console.log("✅ Admin user created successfully!");
    console.log(`   Email: ${admin.email}`);
    console.log(`   Name: ${admin.name}`);
    console.log(`   ID: ${admin.id}`);
    console.log(`   Role: ${admin.role}`);
    console.log(
      `   Storage Quota: ${(admin.storageQuota / 1024 / 1024).toFixed(0)}MB`,
    );
  } catch (error) {
    console.error("❌ Error creating admin:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Парсинг аргументів командного рядка
function parseArgs(): CreateAdminOptions {
  const args = process.argv.slice(2);
  const options: Partial<CreateAdminOptions> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--email" && args[i + 1]) {
      options.email = args[i + 1];
      i++;
    } else if (arg === "--password" && args[i + 1]) {
      options.password = args[i + 1];
      i++;
    } else if (arg === "--name" && args[i + 1]) {
      options.name = args[i + 1];
      i++;
    }
  }

  // Якщо не вказано в аргументах, спробувати з environment variables
  if (!options.email) {
    options.email = process.env.ADMIN_EMAIL || "";
  }
  if (!options.password) {
    options.password = process.env.ADMIN_PASSWORD || "";
  }
  if (!options.name) {
    options.name = process.env.ADMIN_NAME;
  }

  return options as CreateAdminOptions;
}

// Запуск
if (require.main === module) {
  (async () => {
    const options = parseArgs();

    if (!options.email || !options.password) {
      console.error("❌ Email and password are required");
      console.error("");
      console.error("Usage:");
      console.error(
        "  npm run create-admin -- --email admin@example.com --password SecurePass123",
      );
      console.error(
        "  npm run create-admin -- --email admin@example.com --password SecurePass123 --name 'Admin Name'",
      );
      console.error("");
      console.error("Or set environment variables:");
      console.error(
        "  ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=SecurePass123 npm run create-admin",
      );
      process.exit(1);
    }

    await createAdmin(options);
  })().catch((error) => {
    console.error("❌ Unexpected error:", error);
    process.exit(1);
  });
}

export { createAdmin };
