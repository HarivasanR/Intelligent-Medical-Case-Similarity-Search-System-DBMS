import { Cross } from "lucide-react";
export function Logo({ compact = false }: { compact?: boolean }) {
  return <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-600 text-white shadow-lg shadow-teal-100"><Cross size={21}/></span>{!compact && <div><div className="text-lg font-extrabold tracking-tight">MedMatch</div><div className="text-[10px] font-semibold uppercase tracking-[.18em] text-teal-600">Case Intelligence</div></div>}</div>;
}
