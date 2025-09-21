/*
  Warnings:

  - A unique constraint covering the columns `[text]` on the table `Objective` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Objective_text_key" ON "Objective"("text");
