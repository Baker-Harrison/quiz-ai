"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Objective = { id: number; text: string; createdAt: string };

export default function ObjectivesPage() {
  const [items, setItems] = useState<Objective[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");

  const load = async () => {
    const res = await fetch("/api/objectives");
    const data = await res.json();
    setItems(data);
  };

  const bulkAdd = async () => {
    const parts = bulkText
      .split(/\r?\n+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (parts.length === 0) return;
    setBulkLoading(true);
    try {
      const res = await fetch("/api/objectives/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: parts }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to add objectives in bulk");
      }
      setBulkText("");
      await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      alert(msg);
    } finally {
      setBulkLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/objectives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        setText("");
        await load();
      }
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (obj: Objective) => {
    setEditingId(obj.id);
    setEditingText(obj.text);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await fetch(`/api/objectives/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: editingText }),
    });
    setEditingId(null);
    setEditingText("");
    await load();
  };

  const del = async (id: number) => {
    await fetch(`/api/objectives/${id}`, { method: "DELETE" });
    await load();
  };

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Learning Objectives</h1>
        <nav className="text-sm flex gap-3">
          <Link className="underline" href="/">Home</Link>
          <Link className="underline" href="/quiz">Quiz</Link>
          <Link className="underline" href="/insights">Insights</Link>
        </nav>
      </header>

      <form onSubmit={add} className="flex gap-2 mb-6">
        <input
          className="flex-1 border rounded px-3 py-2"
          placeholder="Add a learning objective (e.g., Explain photosynthesis)"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          disabled={loading}
          className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
        >
          Add
        </button>
      </form>

      <section className="mb-6">
        <h2 className="font-medium mb-2">Bulk add objectives</h2>
        <p className="text-sm text-gray-600 mb-2">Paste one objective per line. Blank lines are ignored.</p>
        <textarea
          className="w-full min-h-28 border rounded px-3 py-2"
          placeholder={`Describe the water cycle\nBalance chemical equations\nExplain how neural networks learn`}
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
        />
        <div className="mt-2">
          <button
            onClick={bulkAdd}
            disabled={bulkLoading || bulkText.trim().length === 0}
            className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {bulkLoading ? "Adding..." : "Add All"}
          </button>
        </div>
      </section>

      <ul className="space-y-3">
        {items.map((obj) => (
          <li key={obj.id} className="border rounded p-3 flex items-start justify-between gap-3">
            {editingId === obj.id ? (
              <div className="flex-1 flex gap-2">
                <input
                  className="flex-1 border rounded px-3 py-2"
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                />
                <button onClick={saveEdit} className="bg-green-600 text-white px-3 py-2 rounded">Save</button>
                <button onClick={() => setEditingId(null)} className="px-3 py-2 rounded border">Cancel</button>
              </div>
            ) : (
              <div className="flex-1">
                <p className="font-medium">{obj.text}</p>
                <p className="text-xs text-gray-500 mt-1">Added {new Date(obj.createdAt).toLocaleString()}</p>
              </div>
            )}
            <div className="flex gap-2">
              {editingId !== obj.id && (
                <button onClick={() => startEdit(obj)} className="px-3 py-2 rounded border">Edit</button>
              )}
              <button onClick={() => del(obj.id)} className="px-3 py-2 rounded border text-red-600">Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
