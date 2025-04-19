-- Agrega el rol SUPER_ADMIN al enum UserRole
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
