-- Add unique constraint on Supplier.name
ALTER TABLE "Supplier"
ADD CONSTRAINT "Supplier_name_key" UNIQUE ("name");
