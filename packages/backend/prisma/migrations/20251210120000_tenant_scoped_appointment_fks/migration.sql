-- CreateIndex
CREATE UNIQUE INDEX "professionals_barbershopId_id_key" ON "professionals"("barbershopId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "clients_barbershopId_id_key" ON "clients"("barbershopId", "id");

-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_professionalId_fkey";

-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_clientId_fkey";

-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_createdById_fkey";

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_barbershopId_professionalId_fkey" FOREIGN KEY ("barbershopId", "professionalId") REFERENCES "professionals"("barbershopId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_barbershopId_clientId_fkey" FOREIGN KEY ("barbershopId", "clientId") REFERENCES "clients"("barbershopId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_barbershopId_createdById_fkey" FOREIGN KEY ("barbershopId", "createdById") REFERENCES "professionals"("barbershopId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
