-- CreateTable
CREATE TABLE "QuizAttempt" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "quiz" TEXT NOT NULL,
    "answers" TEXT NOT NULL,
    "feedback" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "enforceQuality" BOOLEAN NOT NULL,
    "correctCount" INTEGER NOT NULL,
    "questionCount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
