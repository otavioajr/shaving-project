-- Migration: Fix Tenant Isolation with Composite Foreign Keys
-- This migration ensures that all foreign key relationships in appointments and transactions
-- are scoped by barbershopId, preventing cross-tenant references.

-- ==========================================
-- STEP 1: Add composite unique indexes on referenced tables
-- These are required for composite foreign keys
-- ==========================================

-- Professionals: (barbershopId, id) must be unique
CREATE UNIQUE INDEX "professionals_barbershopId_id_key" ON "professionals"("barbershopId", "id");

-- Clients: (barbershopId, id) must be unique
CREATE UNIQUE INDEX "clients_barbershopId_id_key" ON "clients"("barbershopId", "id");

-- Services: (barbershopId, id) must be unique
CREATE UNIQUE INDEX "services_barbershopId_id_key" ON "services"("barbershopId", "id");

-- ==========================================
-- STEP 2: Drop existing foreign keys on appointments table
-- ==========================================

ALTER TABLE "appointments" DROP CONSTRAINT "appointments_professionalId_fkey";
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_clientId_fkey";
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_serviceId_fkey";
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_createdById_fkey";

-- ==========================================
-- STEP 3: Add composite foreign keys to appointments
-- These ensure appointments can only reference entities from the same barbershop
-- ==========================================

-- Professional must belong to the same barbershop
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_professionalId_fkey"
  FOREIGN KEY ("barbershopId", "professionalId")
  REFERENCES "professionals"("barbershopId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Client must belong to the same barbershop
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_clientId_fkey"
  FOREIGN KEY ("barbershopId", "clientId")
  REFERENCES "clients"("barbershopId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Service must belong to the same barbershop
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_serviceId_fkey"
  FOREIGN KEY ("barbershopId", "serviceId")
  REFERENCES "services"("barbershopId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Creator (professional) must belong to the same barbershop
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_createdById_fkey"
  FOREIGN KEY ("barbershopId", "createdById")
  REFERENCES "professionals"("barbershopId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ==========================================
-- STEP 4: Fix transactions table
-- ==========================================

-- Drop existing foreign key
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_createdById_fkey";

-- Add composite foreign key
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_createdById_fkey"
  FOREIGN KEY ("barbershopId", "createdById")
  REFERENCES "professionals"("barbershopId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
