-- Add "contacted" and "on_hold" ambassador application statuses
ALTER TYPE "AmbassadorStatus" ADD VALUE IF NOT EXISTS 'contacted';
ALTER TYPE "AmbassadorStatus" ADD VALUE IF NOT EXISTS 'on_hold';
