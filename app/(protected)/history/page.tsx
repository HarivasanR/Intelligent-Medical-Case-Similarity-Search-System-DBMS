import { Clock3, Search } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { demoSearchHistory } from "@/lib/demo-data";
import { formatDate, isDemoMode } from "@/lib/utils";
import { listDatabaseSearchHistory } from "@/services/database-cases";

import { getSession } from "@/lib/auth";
import { DeleteRecord } from "@/components/delete-record";

export default async function HistoryPage(){
  const user = await getSession();
  const history = isDemoMode() ? demoSearchHistory : await listDatabaseSearchHistory(user!.id);
  return <><PageHeading eyebrow="Relational audit trail" title="Search history" description="Review your own searches. Deleting an entry permanently removes it from your history."/><section className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Query</th><th className="px-5 py-3">Method</th><th className="px-5 py-3">Results</th><th className="px-5 py-3">User</th><th className="px-5 py-3">Time</th><th className="px-5 py-3">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{history.map(item=><tr key={item.id}><td className="px-5 py-4"><div className="flex items-start gap-3"><span className="rounded-lg bg-teal-50 p-2 text-teal-600"><Search size={16}/></span><span className="max-w-md font-semibold">{item.query}</span></div></td><td className="px-5 py-4"><span className="badge bg-violet-50 text-violet-700">{item.type}</span></td><td className="px-5 py-4 font-bold">{item.results}</td><td className="px-5 py-4 text-slate-600">{item.user}</td><td className="px-5 py-4"><span className="flex items-center gap-2 whitespace-nowrap text-muted"><Clock3 size={14}/>{formatDate(item.date)}</span></td><td className="px-5 py-4"><DeleteRecord endpoint={`/api/history/${item.id}`} label="Delete entry"/></td></tr>)}</tbody></table>{!history.length&&<div className="p-12 text-center text-sm text-muted">No searches recorded yet. Run a similarity search to see it here.</div>}</div></section></>}
