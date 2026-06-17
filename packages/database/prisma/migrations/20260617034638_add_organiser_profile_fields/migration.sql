-- AlterTable
ALTER TABLE "users" ADD COLUMN     "id_document_type" TEXT,
ADD COLUMN     "id_document_url" TEXT,
ADD COLUMN     "profile_completed" BOOLEAN NOT NULL DEFAULT false;
