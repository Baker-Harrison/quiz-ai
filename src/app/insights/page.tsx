"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Quiz, Feedback } from "@/lib/quizSchema";

export default function InsightsPage() {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [meta, setMeta] = useState<{ groupId: number | null } | null>(null);
  const [groups, setGroups] = useState<Array<{ id: number; name: string }>>([]);
  const [groupId, setGroupId] = useState<number | null>(null);

  useEffect(() => {
    const qRaw = localStorage.getItem("quizData");
    const fRaw = localStorage.getItem("feedbackData");
    const metaRaw = localStorage.getItem("quizMeta");
    if (qRaw) setQuiz(JSON.parse(qRaw));
    if (fRaw) setFeedback(JSON.parse(fRaw));
    if (metaRaw) {
      try {
        const parsed = JSON.parse(metaRaw) as { groupId?: number | null };
        setMeta({ groupId: typeof parsed.groupId === "number" ? parsed.groupId : null });
      } catch {
        setMeta(null);
      }
    }
  }, []);

  const [server, setServer] = useState<{ weakPoints: string[]; strongPoints: string[]; studyPlan: string[] } | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/groups", { cache: "no-store" });
        if (!res.ok) return;
        const data: Array<{ id: number; name: string }> = await res.json();
        setGroups(data);
        setGroupId((prev) => {
          if (prev != null) return prev;
          const preferred = meta?.groupId;
          if (preferred != null && data.some((g) => g.id === preferred)) return preferred;
          return data.length > 0 ? data[0].id : null;
        });
      } catch {
        // ignore
      }
    })();
  }, [meta]);

  useEffect(() => {
    if (groupId == null) {
      setServer({ weakPoints: [], strongPoints: [], studyPlan: [] });
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/insights?groupId=${groupId}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setServer({
            weakPoints: Array.isArray(data.weakPoints) ? data.weakPoints : [],
            strongPoints: Array.isArray(data.strongPoints) ? data.strongPoints : [],
            studyPlan: Array.isArray(data.studyPlan) ? data.studyPlan : [],
          });
        } else {
          setServer({ weakPoints: [], strongPoints: [], studyPlan: [] });
        }
      } catch {
        setServer({ weakPoints: [], strongPoints: [], studyPlan: [] });
      }
    })();
  }, [groupId]);

  const { weakPoints, strongPoints, studyPlan } = useMemo(() => {
    const weak: string[] = [...(server?.weakPoints ?? [])];
    const strong: string[] = [...(server?.strongPoints ?? [])];
    const plan: string[] = [...(server?.studyPlan ?? []), ...(feedback?.studyPlan ?? [])];

    const feedbackMatchesGroup = meta?.groupId == null || meta.groupId === groupId;

    if (quiz && feedback && feedbackMatchesGroup) {
      // Prefer LLM-provided weakPoints if available
      if (feedback.weakPoints && feedback.weakPoints.length) {
        weak.push(...feedback.weakPoints);
      }

      // Derive strong/weak from per-question items if missing or to supplement
      feedback.items.forEach((it) => {
        const q = quiz.questions.find((qq) => qq.id === it.questionId);
        if (!q) return;
        const label = q.prompt;
        if (it.type === "mcq") {
          (it.correct ? strong : weak).push(label);
        } else {
          // for short answers, if model supplied correctness use it; otherwise not categorized
          if (typeof it.correct === "boolean") {
            (it.correct ? strong : weak).push(label);
          }
        }
      });
    }

    // Deduplicate and limit for neat display
    const dedupe = (arr: string[]) => Array.from(new Set(arr)).slice(0, 20);
    return { weakPoints: dedupe(weak), strongPoints: dedupe(strong), studyPlan: dedupe(plan) };
  }, [quiz, feedback, server, meta, groupId]);

  if (!quiz || !feedback) {
    return (
      <div className="min-h-screen p-6 max-w-3xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Insights</h1>
          <nav className="text-sm flex gap-3">
            <Link className="underline" href="/">Home</Link>
            <Link className="underline" href="/quiz">Generate Quiz</Link>
          </nav>
        </header>
        <p>No insights yet. Complete a quiz first.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Insights</h1>
        <nav className="text-sm flex gap-3">
          <Link className="underline" href="/">Home</Link>
          <Link className="underline" href="/quiz">New Quiz</Link>
          <Link className="underline" href="/quiz/results">Results</Link>
          <Link className="underline" href="/practice">Practice</Link>
        </nav>
      </header>

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-gray-600">Insights are scoped to a single learning objective group.</p>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Group</label>
          <select
            value={groupId ?? ""}
            onChange={(e) => {
              const value = e.target.value;
              setGroupId(value ? Number(value) : null);
            }}
            className="border rounded px-3 py-2"
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
      </div>

      <section className="mb-6 p-4 border rounded bg-gray-50 dark:bg-gray-800 dark:text-gray-100">
        <p className="font-medium">Overall</p>
        <p className="text-sm mt-1">{feedback.overall || "No overall summary provided."}</p>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="p-4 border rounded">
          <h2 className="font-medium mb-2">Strong Points</h2>
          {strongPoints.length ? (
            <ul className="list-disc ml-5 space-y-1 text-sm">
              {strongPoints.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-600">No strong points detected yet.</p>
          )}
        </section>

        <section className="p-4 border rounded">
          <h2 className="font-medium mb-2">Weak Points</h2>
          {weakPoints.length ? (
            <ul className="list-disc ml-5 space-y-1 text-sm">
              {weakPoints.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-600">No weak points detected yet.</p>
          )}
        </section>
      </div>

      <section className="mt-6 p-4 border rounded">
        <h2 className="font-medium mb-2">Study Plan</h2>
        {studyPlan.length ? (
          <ul className="list-disc ml-5 space-y-1 text-sm">
            {studyPlan.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-600">No study plan suggestions yet.</p>
        )}
      </section>
    </div>
  );
}
