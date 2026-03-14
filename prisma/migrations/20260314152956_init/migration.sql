-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'suspended', 'deleted');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('customer', 'admin');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('available', 'rented', 'maintenance', 'retired');

-- CreateEnum
CREATE TYPE "RentalStatus" AS ENUM ('active', 'expired', 'cancelled', 'payment_failed');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "full_name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'customer',
    "stripe_customer_id" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "email_verified" TIMESTAMP(3),
    "image" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "linkedin_accounts" (
    "id" UUID NOT NULL,
    "gologin_profile_id" TEXT,
    "linkedin_name" TEXT NOT NULL,
    "linkedin_headline" TEXT,
    "linkedin_url" TEXT,
    "connection_count" INTEGER NOT NULL DEFAULT 0,
    "industry" TEXT,
    "location" TEXT,
    "profile_screenshot_url" TEXT,
    "profile_photo_url" TEXT,
    "proxy_host" TEXT,
    "proxy_port" INTEGER,
    "proxy_username" TEXT,
    "proxy_password" TEXT,
    "status" "AccountStatus" NOT NULL DEFAULT 'maintenance',
    "monthly_price" DECIMAL(10,2) NOT NULL DEFAULT 50.00,
    "account_age_months" INTEGER,
    "has_sales_nav" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "linkedin_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rentals" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "linkedin_account_id" UUID NOT NULL,
    "stripe_subscription_id" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "current_period_end" TIMESTAMP(3),
    "auto_renew" BOOLEAN NOT NULL DEFAULT true,
    "status" "RentalStatus" NOT NULL DEFAULT 'active',
    "access_granted_at" TIMESTAMP(3),
    "access_revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rentals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waitlist" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "linkedin_account_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waitlist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripe_customer_id_key" ON "users"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "rentals_stripe_subscription_id_key" ON "rentals"("stripe_subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_user_id_linkedin_account_id_key" ON "waitlist"("user_id", "linkedin_account_id");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rentals" ADD CONSTRAINT "rentals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rentals" ADD CONSTRAINT "rentals_linkedin_account_id_fkey" FOREIGN KEY ("linkedin_account_id") REFERENCES "linkedin_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_linkedin_account_id_fkey" FOREIGN KEY ("linkedin_account_id") REFERENCES "linkedin_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
