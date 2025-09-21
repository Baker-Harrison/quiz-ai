-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Insight" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "weakPoints" TEXT NOT NULL,
    "strongPoints" TEXT NOT NULL,
    "studyPlan" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "groupId" INTEGER,
    CONSTRAINT "Insight_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Insight" ("createdAt", "id", "key", "strongPoints", "studyPlan", "updatedAt", "weakPoints") SELECT "createdAt", "id", "key", "strongPoints", "studyPlan", "updatedAt", "weakPoints" FROM "Insight";
DROP TABLE "Insight";
ALTER TABLE "new_Insight" RENAME TO "Insight";
CREATE UNIQUE INDEX "Insight_key_groupId_key" ON "Insight"("key", "groupId");
CREATE TABLE "new_QuizAttempt" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "quiz" TEXT NOT NULL,
    "answers" TEXT NOT NULL,
    "feedback" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "enforceQuality" BOOLEAN NOT NULL,
    "correctCount" INTEGER NOT NULL,
    "questionCount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "groupId" INTEGER,
    CONSTRAINT "QuizAttempt_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_QuizAttempt" ("answers", "correctCount", "createdAt", "domain", "enforceQuality", "feedback", "id", "questionCount", "quiz", "updatedAt") SELECT "answers", "correctCount", "createdAt", "domain", "enforceQuality", "feedback", "id", "questionCount", "quiz", "updatedAt" FROM "QuizAttempt";
DROP TABLE "QuizAttempt";
ALTER TABLE "new_QuizAttempt" RENAME TO "QuizAttempt";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
