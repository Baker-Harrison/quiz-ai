"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

export default function PracticePage() {
  const [weak, setWeak] = useState<string[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [mode, setMode] = useState<"mcq" | "short">("mcq");
  const [count, setCount] = useState<number>(10);
  const [domain, setDomain] = useState<"pharmacy">("pharmacy");
  const [enforceQuality, setEnforceQuality] = useState<boolean>(true);
  const [caseBasedMin, setCaseBasedMin] = useState<number>(Math.max(1, Math.floor(10 * 0.3)));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<Array<{ id: number; name: string }>>([]);
  const [groupId, setGroupId] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/groups", { cache: "no-store" });
        if (!res.ok) return;
        const data: Array<{ id: number; name: string }> = await res.json();
        setGroups(data);
        const metaRaw = typeof window !== "undefined" ? localStorage.getItem("quizMeta") : null;
        let preferred: number | null = null;
        if (metaRaw) {
          try {
            const parsed = JSON.parse(metaRaw) as { groupId?: number };
            if (typeof parsed.groupId === "number") preferred = parsed.groupId;
          } catch {
            // ignore
          }
        }
        setGroupId((prev) => {
          if (prev != null) return prev;
          if (preferred != null && data.some((g) => g.id === preferred)) return preferred;
          return data.length > 0 ? data[0].id : null;
        });
      } catch {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    if (groupId == null) {
      setWeak([]);
      setSelected({});
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/insights?groupId=${groupId}`, { cache: "no-store" });
        if (!res.ok) {
          setWeak([]);
          setSelected({});
          return;
        }
        const data = await res.json();
        const w: string[] = data.weakPoints ?? [];
        setWeak(w);
        setSelected(Object.fromEntries(w.map((s: string) => [s, true])));
      } catch {
        setWeak([]);
        setSelected({});
      }
    })();
  }, [groupId]);

  const chosen = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);

  const start = async () => {
    setLoading(true);
    setError(null);
    try {
      if (groupId == null) throw new Error("Select a group before starting practice");
      if (chosen.length === 0) throw new Error("Select at least one weak point");
      const res = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objectives: chosen, mode, count, domain, enforceQuality, caseBasedMin, groupId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to generate practice quiz");
      }
      const quiz = await res.json();
      const selectedGroup = groups.find((g) => g.id === groupId);
      localStorage.setItem("quizData", JSON.stringify(quiz));
      localStorage.setItem(
        "quizMeta",
        JSON.stringify({ domain, enforceQuality, groupId, groupName: selectedGroup?.name ?? null })
      );
      window.location.href = "/quiz/take";
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
        <h1 className="text-2xl font-semibold">Targeted Practice</h1>
        <nav className="text-sm flex gap-3">
          <Link className="underline" href="/">Home</Link>
          <Link className="underline" href="/insights">Insights</Link>
          <Link className="underline" href="/quiz">Quiz</Link>
        </nav>
      </header>

      <section className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <h2 className="font-medium">Select weak points to practice</h2>
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
        {weak.length === 0 ? (
          <p className="text-sm text-gray-600">No weak points saved yet. Complete a quiz and submit to generate insights.</p>
        ) : (
          <ul className="space-y-2">
            {weak.map((w) => (
              <li key={w} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!selected[w]}
                  onChange={(e) => setSelected((prev) => ({ ...prev, [w]: e.target.checked }))}
                />
                <span>{w}</span>
              </li>
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
        onClick={start}
        disabled={loading || chosen.length === 0}
        className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? "Generating..." : `Start Practice (${chosen.length} topics)`}
      </button>
      {error && <p className="text-red-600 mt-3">{error}</p>}
    </div>
  );
}
