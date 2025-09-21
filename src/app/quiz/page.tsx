"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Quiz } from "@/lib/quizSchema";

type ObjectiveItem = { id: number; text: string };

export default function QuizGeneratePage() {
  const [objectives, setObjectives] = useState<ObjectiveItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"mcq" | "short">("mcq");
  const [count, setCount] = useState<number>(5);
  const [domain, setDomain] = useState<"pharmacy">("pharmacy");
  const [enforceQuality, setEnforceQuality] = useState<boolean>(true);
  const [caseBasedMin, setCaseBasedMin] = useState<number>(Math.max(1, Math.floor(5 * 0.3)));
  const [groups, setGroups] = useState<Array<{ id: number; name: string }>>([]);
  const [groupId, setGroupId] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const gr = await fetch("/api/groups", { cache: "no-store" });
        if (gr.ok) {
          const g: Array<{ id: number; name: string }> = await gr.json();
          setGroups(g);
          if (g.length > 0) {
            setGroupId((prev) => (prev == null ? g[0].id : prev));
          }
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    if (groupId == null) {
      setObjectives([]);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/objectives?groupId=${groupId}`);
        if (!res.ok || cancelled) return;
        const data: { id: number; text: string; createdAt: string }[] = await res.json();
        if (!cancelled) setObjectives(data.map(({ id, text }) => ({ id, text })));
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [groupId]);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const objectiveIds = objectives.map((o) => o.id);
      const objectiveTexts = objectives.map((o) => o.text);
      const res = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objectives: objectiveTexts, objectiveIds, mode, count, domain, enforceQuality, caseBasedMin, groupId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to generate quiz");
      }
      const quiz: Quiz = await res.json();
      localStorage.setItem("quizData", JSON.stringify(quiz));
      const selectedGroup = groups.find((g) => g.id === groupId);
      localStorage.setItem(
        "quizMeta",
        JSON.stringify({ domain, enforceQuality, groupId, groupName: selectedGroup?.name ?? null })
      );
      router.push("/quiz/take");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Generate Quiz</h1>
        <nav className="text-sm flex gap-3">
          <Link className="underline" href="/">Home</Link>
          <Link className="underline" href="/objectives">Objectives</Link>
          <Link className="underline" href="/quiz/history">History</Link>
        </nav>
      </header>

      <section className="mb-6">
        <h2 className="font-medium mb-2">Learning Objectives</h2>
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Group</label>
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
        {objectives.length === 0 ? (
          <p className="text-gray-600">No objectives yet. Add some on the <Link className="underline" href="/objectives">Objectives</Link> page.</p>
        ) : (
          <ul className="list-disc ml-5 space-y-1">
            {objectives.map((o) => (
              <li key={o.id}>{o.text}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-6 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium mb-1">Question type</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as "mcq" | "short")}
            className="border rounded px-3 py-2 w-full"
          >
            <option value="mcq">Multiple Choice</option>
            <option value="short">Short Answer</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Number of questions</label>
          <input
            type="number"
            min={1}
            max={100}
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
            className="border rounded px-3 py-2 w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Domain</label>
          <select
            value={domain}
            onChange={(e) => setDomain(e.target.value as "pharmacy")}
            className="border rounded px-3 py-2 w-full"
          >
            <option value="pharmacy">Pharmacy</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Minimum case-based items</label>
          <input
            type="number"
            min={0}
            max={count}
            value={caseBasedMin}
            onChange={(e) => setCaseBasedMin(Math.max(0, Math.min(count, Number(e.target.value) || 0)))}
            className="border rounded px-3 py-2 w-full"
          />
          <p className="text-xs text-gray-500 mt-1">At least this many scenario-based questions will be requested.</p>
        </div>
        <div className="sm:col-span-2 flex items-center gap-2">
          <input id="enforceQuality" type="checkbox" checked={enforceQuality} onChange={(e) => setEnforceQuality(e.target.checked)} />
          <label htmlFor="enforceQuality" className="text-sm">Enforce quality and domain guidelines</label>
        </div>
      </section>

      <button
        onClick={generate}
        disabled={loading || objectives.length === 0}
        className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? "Generating..." : `Generate ${count}-Question Quiz`}
      </button>
      {error && <p className="text-red-600 mt-3">{error}</p>}
    </div>
  );
}
