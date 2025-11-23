import { PrismaClient, Role } from "@prisma/client";
import { hashPassword } from "../lib/passwordManager";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Перевірити чи є адміністратори
  const adminCount = await prisma.user.count({
    where: { role: "ADMIN" },
  });

  if (adminCount > 0) {
    console.log("✅ Admin users already exist. Skipping admin creation.");
    return;
  }

  // Отримати дані з environment variables
  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin123!@#";
  const adminName = process.env.ADMIN_NAME || "System Administrator";

  console.log(`📧 Creating admin user: ${adminEmail}`);

  // Хешувати пароль
  const hashedPassword = await hashPassword(adminPassword);

  // Створити першого адміна
  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      name: adminName,
      password: hashedPassword,
      role: Role.ADMIN,
      emailVerified: new Date(), // Автоматично верифікований
      storageQuota: 1073741824, // 1GB для адміна
    },
  });

  console.log("✅ Admin user created successfully!");
  console.log(`   Email: ${admin.email}`);
  console.log(`   ID: ${admin.id}`);
  console.log(`   Role: ${admin.role}`);
  console.log("");
  console.log("⚠️  IMPORTANT: Change the default password after first login!");
  console.log(`   Default password: ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
