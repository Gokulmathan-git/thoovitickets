-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "org_commission" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "org_commission_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "org_payout" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "platform_fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "platform_fee_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ticket_types" ALTER COLUMN "max_per_order" SET DEFAULT 5;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "org_commission_percent" DECIMAL(5,2);

-- CreateTable
CREATE TABLE "platform_config" (
    "id" TEXT NOT NULL,
    "platform_fee_percent" DECIMAL(5,2) NOT NULL DEFAULT 3.00,
    "default_org_commission" DECIMAL(5,2) NOT NULL DEFAULT 2.00,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_config_pkey" PRIMARY KEY ("id")
);
