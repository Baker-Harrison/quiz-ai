"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Objective = { id: number; text: string; createdAt: string };
type Group = { id: number; name: string };

export default function ObjectivesPage() {
  const [items, setItems] = useState<Objective[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState<number | null>(null);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const load = async () => {
    try {
      const qs = groupId ? `?groupId=${groupId}` : "";
      const res = await fetch(`/api/objectives${qs}`);
      if (!res.ok) {
        // Attempt to read error body for debugging but do not break UI
        try {
          const err = await res.json();
          console.error("Failed to load objectives:", err);
        } catch {
          // ignore
        }
        setItems([]);
        return;
      }
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error fetching objectives:", e);
      setItems([]);
    }
  };

  const createGroup = async () => {
    if (!newGroupName.trim()) return;
    setCreatingGroup(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGroupName.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to create group");
      }
      const g: Group = await res.json();
      setGroups((prev) => [...prev, g].sort((a, b) => a.name.localeCompare(b.name)));
      setGroupId(g.id);
      setNewGroupName("");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      alert(msg);
    } finally {
      setCreatingGroup(false);
    }
  };

  const loadGroups = async () => {
    try {
      const res = await fetch("/api/groups", { cache: "no-store" });
      if (!res.ok) return;
      const data: Group[] = await res.json();
      setGroups(data);
      if (!groupId && data.length > 0) setGroupId(data[0].id);
    } catch {
      // ignore
    }
  };

  const bulkAdd = async () => {
    const parts = bulkText
      .split(/\r?\n+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (parts.length === 0) return;
    if (groupId === null) {
      alert("Select a group before adding objectives.");
      return;
    }
    setBulkLoading(true);
    try {
      const payload: { items: string[]; groupId?: number } = { items: parts };
      if (groupId !== null) payload.groupId = groupId;
      const res = await fetch("/api/objectives/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
    (async () => {
      await loadGroups();
    })();
  }, []);

  useEffect(() => {
    if (groupId !== null) {
      load();
    }
  }, [groupId]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (groupId === null) {
      alert("Select a group before adding objectives.");
      return;
    }
    setLoading(true);
    try {
      const payload: { text: string; groupId?: number } = { text: text.trim() };
      if (groupId !== null) payload.groupId = groupId;
      const res = await fetch("/api/objectives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to add objective");
      }
      setText("");
      await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      alert(msg);
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

  const deleteAll = async () => {
    if (window.confirm("Are you sure you want to delete all objectives? This cannot be undone.")) {
      await fetch(`/api/objectives`, { method: "DELETE" });
      await load();
    }
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

      <section className="mb-4 flex flex-col sm:flex-row sm:items-end gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Group</label>
          <select
            value={groupId ?? undefined}
            onChange={(e) => setGroupId(Number(e.target.value))}
            className="border rounded px-3 py-2 min-w-48"
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <label className="block text-sm font-medium mb-1">New group</label>
            <input
              className="border rounded px-3 py-2"
              placeholder="e.g., POPP 2"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
            />
          </div>
          <button onClick={createGroup} disabled={creatingGroup || !newGroupName.trim()} className="border rounded px-3 py-2">
            {creatingGroup ? "Creating..." : "Create Group"}
          </button>
        </div>
      </section>

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

      {items.length > 0 && (
        <div className="text-right mb-4">
          <button onClick={deleteAll} className="px-3 py-2 rounded border text-red-600">Delete All</button>
        </div>
      )}

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
