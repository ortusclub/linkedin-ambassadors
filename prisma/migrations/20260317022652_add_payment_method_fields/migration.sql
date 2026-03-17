-- AlterTable
ALTER TABLE "ambassador_applications" ADD COLUMN     "payment_method" TEXT,
ADD COLUMN     "paypal_email" TEXT,
ADD COLUMN     "usdc_network" TEXT,
ADD COLUMN     "usdc_wallet_address" TEXT,
ADD COLUMN     "wise_email" TEXT;
