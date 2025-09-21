-- DropIndex
DROP INDEX "Objective_text_key";

-- CreateIndex
CREATE UNIQUE INDEX "Objective_text_groupId_key" ON "Objective"("text", "groupId");
