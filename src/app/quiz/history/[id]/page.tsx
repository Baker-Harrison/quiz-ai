import Link from "next/link";
import { notFound } from "next/navigation";
import { getQuizAttempt } from "@/lib/quizHistory";

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

export default async function QuizHistoryDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) notFound();

  const attempt = await getQuizAttempt(numericId);
  if (!attempt || attempt.quiz.questions.length === 0) notFound();

  const items = attempt.feedback.items;
  const score = `${attempt.correctCount}/${attempt.questionCount}`;
  const groupLabel = attempt.groupName ?? "Ungrouped";

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Quiz Attempt #{attempt.id}</h1>
          <p className="text-sm text-gray-600">Taken {formatDate(attempt.createdAt)}</p>
          <p className="text-sm text-gray-500">Group: {groupLabel}</p>
        </div>
        <nav className="text-sm flex gap-3">
          <Link className="underline" href="/quiz/history">Back to history</Link>
          <Link className="underline" href="/quiz">New quiz</Link>
        </nav>
      </header>

      <section className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="border rounded p-4">
          <p className="text-sm text-gray-500 uppercase tracking-wide">Score</p>
          <p className="text-xl font-semibold">{score}</p>
        </div>
        <div className="border rounded p-4">
          <p className="text-sm text-gray-500 uppercase tracking-wide">Domain</p>
          <p className="text-xl font-semibold">{attempt.domain}</p>
          {!attempt.enforceQuality && <p className="text-xs text-gray-500">Quality guidelines disabled</p>}
        </div>
        <div className="border rounded p-4 sm:col-span-2">
          <p className="text-sm text-gray-500 uppercase tracking-wide">Group</p>
          <p className="text-xl font-semibold">{groupLabel}</p>
        </div>
      </section>

      <ol className="space-y-6">
        {attempt.quiz.questions.map((q, qi) => {
          const item = items.find((it) => it.questionId === q.id);
          const base = "border rounded p-4";
          if (q.type === "mcq") {
            const mcqItem = item && item.type === "mcq" ? item : null;
            const userIndex = mcqItem ? mcqItem.userIndex : -1;
            const correct = mcqItem ? mcqItem.correct : false;
            return (
              <li key={q.id} className={`${base} ${correct ? "border-green-600" : "border-red-600"}`}>
                <p className="font-medium mb-3">{qi + 1}. {q.prompt}</p>
                <ul className="space-y-1">
                  {q.options.map((opt, oi) => (
                    <li
                      key={oi}
                      className={`${oi === q.correctIndex ? "text-green-700" : ""} ${oi === userIndex && oi !== q.correctIndex ? "text-red-700" : ""}`}
                    >
                      {oi === userIndex ? "→ " : ""}{opt}
                    </li>
                  ))}
                </ul>
                {mcqItem?.feedback && (
                  <p className="mt-3 text-sm text-gray-800"><span className="font-semibold">Feedback:</span> {mcqItem.feedback}</p>
                )}
              </li>
            );
          }

          const shortItem = item && item.type === "short" ? item : null;
          const userText = shortItem ? shortItem.userText : "";
          return (
            <li key={q.id} className={`${base} border-blue-600`}>
              <p className="font-medium mb-3">{qi + 1}. {q.prompt}</p>
              <div className="text-sm space-y-1">
                <p><span className="font-semibold">Your answer:</span> {userText || "(empty)"}</p>
                <p className="text-gray-700"><span className="font-semibold">Expected:</span> {q.answerText}</p>
              </div>
              {shortItem?.feedback && (
                <p className="mt-3 text-sm text-gray-800"><span className="font-semibold">Feedback:</span> {shortItem.feedback}</p>
              )}
            </li>
          );
        })}
      </ol>

      {attempt.feedback.overall && (
        <div className="mt-6 p-4 border rounded bg-gray-50">
          <p className="font-medium">Overall feedback</p>
          <p className="text-sm mt-1">{attempt.feedback.overall}</p>
        </div>
      )}
    </div>
  );
}
