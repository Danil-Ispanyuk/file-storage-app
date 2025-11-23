# Створення першого адміністратора

Цей документ описує способи створення першого адміністратора в системі.

## Варіанти створення адміна

### Варіант 1: Prisma Seed (Автоматичний)

При першому запуску seed скрипту автоматично створюється адмін, якщо його ще немає.

```bash
npm run prisma:seed
```

**Налаштування через environment variables:**

```bash
# .env або .env.local
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=SecurePassword123!
ADMIN_NAME="System Administrator"
```

**За замовчуванням (якщо не вказано):**

- Email: `admin@example.com`
- Password: `Admin123!@#`
- Name: `System Administrator`

⚠️ **ВАЖЛИВО:** Змініть пароль за замовчуванням після першого входу!

---

### Варіант 2: CLI команда (Рекомендовано)

Використовуйте CLI команду для створення адміна з кастомними даними:

```bash
# Інтерактивний режим
npm run create-admin

# З параметрами
npm run create-admin -- --email admin@example.com --password SecurePass123

# З усіма параметрами
npm run create-admin -- --email admin@example.com --password SecurePass123 --name "Admin Name"
```

**Або через environment variables:**

```bash
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=SecurePass123 npm run create-admin
```

---

### Варіант 3: Через Prisma Studio (Ручний)

1. Запустити Prisma Studio:

```bash
npx prisma studio
```

2. Відкрити таблицю `User`
3. Натиснути "Add record"
4. Заповнити поля:
   - `email`: email адреса
   - `password`: **хешований пароль** (використайте `hashPassword` з `lib/passwordManager.ts`)
   - `name`: ім'я (опціонально)
   - `role`: `ADMIN`
   - `emailVerified`: поточна дата
   - `storageQuota`: `1073741824` (1GB)

⚠️ **УВАГА:** Пароль повинен бути хешований через bcrypt!

---

### Варіант 4: Через SQL (Для розробників)

```sql
-- Спочатку хешуйте пароль (використайте Node.js скрипт або онлайн bcrypt)
-- Приклад хешу для пароля "Admin123!@#":
-- $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy

INSERT INTO "User" (
  id,
  email,
  name,
  password,
  role,
  "emailVerified",
  "storageQuota",
  "usedStorage",
  "createdAt",
  "updatedAt"
) VALUES (
  'cuid()', -- або конкретний ID
  'admin@example.com',
  'System Administrator',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', -- хешований пароль
  'ADMIN',
  NOW(),
  1073741824, -- 1GB
  0,
  NOW(),
  NOW()
);
```

---

## Перевірка створення адміна

Після створення адміна перевірте:

```bash
# Через Prisma Studio
npx prisma studio
# Відкрити таблицю User, знайти користувача з role=ADMIN

# Або через SQL
psql $DATABASE_URL
SELECT id, email, role, "createdAt" FROM "User" WHERE role = 'ADMIN';
```

---

## Безпека

### Рекомендації:

1. **Змініть пароль за замовчуванням** після першого входу
2. **Увімкніть 2FA** для адміністративного акаунту
3. **Використовуйте сильний пароль** (мінімум 12 символів, змішаний регістр, цифри, символи)
4. **Не зберігайте паролі** в коді або в системі контролю версій
5. **Використовуйте environment variables** для конфіденційних даних

### Приклад сильного пароля:

```
Admin@2024!Secure#Pass
```

---

## Troubleshooting

### Помилка: "User already exists"

- Користувач з таким email вже існує
- Використайте інший email або видаліть існуючого користувача

### Помилка: "Invalid password"

- Пароль повинен бути мінімум 8 символів
- Перевірте правильність введення

### Помилка: "Database connection failed"

- Перевірте `DATABASE_URL` в `.env`
- Переконайтеся, що база даних запущена

---

## Після створення адміна

1. **Увійдіть в систему** з створеними обліковими даними
2. **Змініть пароль** в налаштуваннях профілю
3. **Увімкніть 2FA** для додаткового захисту
4. **Створіть інших адмінів** (якщо потрібно) через адміністративний UI (після його реалізації)

---

## Автоматизація в CI/CD

Для автоматичного створення адміна в production:

```yaml
# GitHub Actions example
- name: Create admin user
  run: |
    npm run create-admin -- \
      --email ${{ secrets.ADMIN_EMAIL }} \
      --password ${{ secrets.ADMIN_PASSWORD }} \
      --name "System Admin"
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

⚠️ **ВАЖЛИВО:** Використовуйте secrets для зберігання паролів!
