-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "aadhar_document_url" TEXT,
ADD COLUMN IF NOT EXISTS "pan_document_url" TEXT,
ADD COLUMN IF NOT EXISTS "gst_number" TEXT,
ADD COLUMN IF NOT EXISTS "status_reason" TEXT;
