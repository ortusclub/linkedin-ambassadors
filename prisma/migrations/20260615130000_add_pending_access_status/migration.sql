-- Add pending_access to RentalStatus enum (paid + reserved, awaiting team grant)
ALTER TYPE "RentalStatus" ADD VALUE IF NOT EXISTS 'pending_access';
