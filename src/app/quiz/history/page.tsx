import Link from "next/link";
import { listQuizAttempts } from "@/lib/quizHistory";

function formatDate(value: Date): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(value);
  } catch {
    return value.toISOString();
  }
}

export default async function QuizHistoryPage() {
  const attempts = await listQuizAttempts(50);

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Quiz History</h1>
        <nav className="text-sm flex gap-3">
          <Link className="underline" href="/">Home</Link>
          <Link className="underline" href="/quiz">New Quiz</Link>
        </nav>
      </header>

      {attempts.length === 0 ? (
        <p className="text-gray-600">No past quizzes yet. Generate a quiz to get started.</p>
      ) : (
        <ul className="space-y-4">
          {attempts.map((attempt) => {
            const score = `${attempt.correctCount}/${attempt.questionCount}`;
            const groupLabel = attempt.groupName ?? "Ungrouped";
            return (
              <li key={attempt.id} className="border rounded p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="font-medium">Attempt #{attempt.id}</p>
                  <p className="text-sm text-gray-600">{formatDate(attempt.createdAt)}</p>
                  <p className="text-sm text-gray-600">Score: {score}</p>
                  <p className="text-sm text-gray-500">Group: {groupLabel}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs uppercase tracking-wide text-gray-500">{attempt.domain}</span>
                  <Link className="underline" href={`/quiz/history/${attempt.id}`}>
                    View details
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
