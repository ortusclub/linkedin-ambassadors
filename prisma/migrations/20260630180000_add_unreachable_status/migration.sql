-- Add "unreachable" to ambassador application status
ALTER TYPE "AmbassadorStatus" ADD VALUE IF NOT EXISTS 'unreachable';
