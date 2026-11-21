"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function SyncButton() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function sync() {
    setBusy(true);
    try { const r = await fetch("/api/admin/sync", { method: "POST" }); const body = await r.json(); setMessage(body.message || body.error); router.refresh(); }
    catch { setMessage("Could not reach the server."); }
    finally { setBusy(false); }
  }
  return <div className="mt-5"><button className="btn-secondary" disabled={busy} onClick={sync}>{busy ? "Synchronizing…" : "Retry synchronization"}</button>{message && <p role="status" className="mt-2 text-sm">{message}</p>}</div>;
}
