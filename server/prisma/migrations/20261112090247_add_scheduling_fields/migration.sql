-- AlterTable
ALTER TABLE "Task" ADD COLUMN "endTime" TEXT;
ALTER TABLE "Task" ADD COLUMN "estimatedDuration" INTEGER;
ALTER TABLE "Task" ADD COLUMN "scheduledDate" DATETIME;
ALTER TABLE "Task" ADD COLUMN "startTime" TEXT;

-- CreateIndex
CREATE INDEX "Task_scheduledDate_idx" ON "Task"("scheduledDate");
