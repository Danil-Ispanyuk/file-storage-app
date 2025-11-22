# File Storage App - Secure File Storage with 2FA

Secure file storage application with two-factor authentication, encryption, and audit logging.

## Features

- 🔐 Two-factor authentication (TOTP)
- 🔒 File encryption (AES-256-GCM)
- 📊 Audit logging
- 🛡️ Rate limiting
- 👥 Role-based access control (ADMIN, MANAGER, USER, GUEST)
- 📁 File upload/download/delete
- 🔍 File integrity verification (SHA-256)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- npm or yarn

### Installation

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Set up environment variables:**

   Create a `.env` file in the root directory:

   ```env
   DATABASE_URL="postgresql://user:password@host:port/database"
   AUTH_SECRET="мінімум-32-символи-випадковий-ключ"

   # AWS S3 Storage (required)
   S3_REGION="us-east-1"
   S3_BUCKET="your-bucket-name"
   S3_ACCESS_KEY_ID="your-aws-access-key-id"
   S3_SECRET_ACCESS_KEY="your-aws-secret-access-key"

   FILE_ENCRYPTION_KEY="мінімум-32-символи-ключ-для-шифрування-файлів"

   # Optional: Upstash Redis for rate limiting (if not set, rate limiting is disabled in dev)
   UPSTASH_REDIS_REST_URL="https://..."
   UPSTASH_REDIS_REST_TOKEN="..."
   ```

   Generate encryption keys:

   ```bash
   # Generate AUTH_SECRET
   openssl rand -hex 32

   # Generate FILE_ENCRYPTION_KEY
   openssl rand -hex 32
   ```

3. **Set up database:**

   ```bash
   # Generate Prisma Client
   npx prisma generate

   # Apply migrations
   npx prisma migrate deploy

   # Or for development (sync schema without creating migration)
   npx prisma db push
   ```

4. **Run the development server:**

   ```bash
   npm run dev
   ```

5. **Open [http://localhost:3000](http://localhost:3000)**

## Project Structure

```
file-storage-app/
├── app/
│   ├── api/
│   │   ├── auth/          # Authentication endpoints
│   │   └── files/         # File management endpoints
│   ├── auth/              # Login/Register pages
│   └── settings/          # User settings
├── components/
│   ├── ui/                # UI components (shadcn)
│   ├── FileUpload.tsx     # File upload component
│   ├── FileList.tsx       # File list component
│   └── FileItem.tsx       # File item component
├── lib/
│   ├── auth.ts            # NextAuth configuration
│   ├── fileStorage.ts     # S3 file storage
│   ├── fileEncryption.ts  # File encryption/decryption
│   ├── fileHashing.ts     # File integrity hashing
│   ├── fileAccess.ts      # Access control
│   ├── rateLimit.ts       # Rate limiting
│   └── auditLog.ts        # Audit logging
├── prisma/
│   └── schema.prisma      # Database schema
└── utils/
    └── formatFileSize.ts  # Formatting utilities
```

## API Endpoints

### Files

- `POST /api/files/upload` - Upload a file
- `GET /api/files` - List user's files (with pagination)
- `GET /api/files/:id/download` - Download a file
- `DELETE /api/files/:id` - Delete a file

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/check-credentials` - Check credentials
- `POST /api/auth/2fa/setup` - Setup 2FA
- `POST /api/auth/2fa/verify` - Verify 2FA code

## File Storage

MVP uses **AWS S3** for file storage. Files are encrypted before storage using AES-256-GCM.

For detailed setup instructions, see [SETUP.md](./SETUP.md)

## Security Features

- **Encryption**: Files encrypted with AES-256-GCM before storage
- **Integrity**: SHA-256 hashes verify file integrity
- **2FA**: Mandatory two-factor authentication
- **Rate Limiting**: Protection against brute force attacks
- **Audit Logging**: All operations are logged
- **Access Control**: Role-based permissions

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
```

## Database

```bash
npx prisma generate      # Generate Prisma Client
npx prisma db push       # Sync schema (dev)
npx prisma migrate dev   # Create and apply migration
npx prisma migrate deploy # Apply migrations (production)
npx prisma studio        # Open Prisma Studio
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [NextAuth.js Documentation](https://next-auth.js.org)
