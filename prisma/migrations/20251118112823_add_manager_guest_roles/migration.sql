-- AlterEnum
-- This migration adds MANAGER and GUEST roles to the Role enum
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'MANAGER';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'GUEST';

