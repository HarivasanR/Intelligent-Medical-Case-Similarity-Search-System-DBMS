"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteRecord({ endpoint, label, redirectTo }: { endpoint: string; label: string; redirectTo?: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function remove() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(endpoint, { method: "DELETE" });
      const body = await response.json();
      if (!response.ok) { setMessage(body.error); return; }
      if (body.demo) { setMessage("Preview only: nothing was deleted. Use database mode to persist changes."); return; }
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch { setMessage("Could not reach the server."); }
    finally { setBusy(false); setConfirm(false); }
  }
  return <div className="text-sm">{confirm ? <div className="flex items-center gap-2"><span>Confirm deletion?</span><button className="btn-secondary text-red-700" disabled={busy} onClick={remove}>{busy ? "Deleting…" : "Confirm"}</button><button className="btn-secondary" disabled={busy} onClick={() => setConfirm(false)}>Cancel</button></div> : <button className="btn-secondary text-red-700" onClick={() => setConfirm(true)}>{label}</button>}{message && <p role="status" className="mt-2 max-w-sm text-amber-800">{message}</p>}</div>;
}
