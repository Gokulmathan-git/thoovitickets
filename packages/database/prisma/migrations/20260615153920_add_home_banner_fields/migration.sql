-- AlterTable
ALTER TABLE "events" ADD COLUMN     "home_banner_desc" TEXT,
ADD COLUMN     "home_banner_title" TEXT,
ADD COLUMN     "home_banner_url" TEXT,
ADD COLUMN     "show_on_home_banner" BOOLEAN NOT NULL DEFAULT false;
