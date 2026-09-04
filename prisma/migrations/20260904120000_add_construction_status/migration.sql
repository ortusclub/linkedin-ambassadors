-- AlterEnum: add an explicit "under_construction" account status.
-- "Construction" was previously a display-only bucket derived from connection
-- count. This value lets an account be placed in the Construction group directly
-- from the edit page, regardless of size. It is not "available", so it is never
-- rentable while set.
ALTER TYPE "AccountStatus" ADD VALUE 'under_construction' AFTER 'maintenance';
