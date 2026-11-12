"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Filter, Search } from "lucide-react";
import type { MedicalCase } from "@/types";
import { formatDate } from "@/lib/utils";

interface CasesTableProps {
  initialItems: MedicalCase[];
  initialTotal: number;
  initialTotalPages: number;
  initialCategories: string[];
}

export function CasesTable({ initialItems, initialTotal, initialTotalPages, initialCategories }: CasesTableProps) {
  const [items, setItems] = useState(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [totalPages, setTotalPages] = useState(Math.max(1, initialTotalPages));
  const [categories, setCategories] = useState(initialCategories);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [gender, setGender] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({ page: String(page), pageSize: "10" });
      if (query.trim()) params.set("q", query.trim());
      if (category) params.set("category", category);
      if (gender) params.set("gender", gender);

      try {
        const response = await fetch(`/api/cases?${params.toString()}`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load cases.");
        setItems(data.items);
        setTotal(data.total);
        setTotalPages(Math.max(1, data.totalPages));
        setCategories(data.categories);
      } catch (fetchError) {
        if (!controller.signal.aborted) {
          setError(fetchError instanceof Error ? fetchError.message : "Unable to load cases.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [page, query, category, gender]);

  const updateFilter = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setPage(1);
  };

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 text-slate-400" size={17}/>
          <input className="input pl-10" placeholder="Search by case ID, symptom, or diagnosis…" value={query} onChange={e => updateFilter(setQuery)(e.target.value)}/>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Filter className="absolute left-3 top-3 text-slate-400" size={16}/>
            <select className="input min-w-44 pl-9" value={category} onChange={e => updateFilter(setCategory)(e.target.value)}>
              <option value="">All categories</option>
              {categories.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <select className="input min-w-36" value={gender} onChange={e => updateFilter(setGender)(e.target.value)}>
            <option value="">All genders</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>

      {error && <div role="alert" className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700">{error}</div>}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] uppercase tracking-wider text-slate-500">
            <tr><th className="px-5 py-3">Case</th><th className="px-5 py-3">Patient</th><th className="px-5 py-3">Symptoms</th><th className="px-5 py-3">Diagnosis</th><th className="px-5 py-3">Category</th><th className="px-5 py-3">Date</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100" aria-busy={loading}>
            {items.map(item => (
              <tr className="transition hover:bg-teal-50/40" key={item.id}>
                <td className="px-5 py-4"><Link href={`/cases/${item.id}`} className="font-extrabold text-teal-700">{item.caseCode}</Link></td>
                <td className="px-5 py-4"><div className="font-semibold">{item.patientAge} years</div><div className="text-xs capitalize text-muted">{item.patientGender.toLowerCase()}</div></td>
                <td className="max-w-xs px-5 py-4 text-slate-600"><div className="line-clamp-2">{item.symptoms}</div></td>
                <td className="px-5 py-4 font-semibold">{item.diagnosis}</td>
                <td className="px-5 py-4"><span className="badge bg-slate-100 text-slate-600">{item.category}</span></td>
                <td className="whitespace-nowrap px-5 py-4 text-muted">{formatDate(item.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && !items.length && <div className="p-12 text-center text-sm text-muted">No cases match the selected filters.</div>}
        {loading && <div className="p-4 text-center text-sm text-muted">Loading cases…</div>}
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-sm">
        <span className="text-muted">Showing {items.length} of {total} cases</span>
        <div className="flex items-center gap-2">
          <button aria-label="Previous page" className="btn-secondary !p-2" disabled={page === 1 || loading} onClick={() => setPage(current => current - 1)}><ChevronLeft size={16}/></button>
          <span className="px-2 font-semibold">{page} / {totalPages}</span>
          <button aria-label="Next page" className="btn-secondary !p-2" disabled={page >= totalPages || loading} onClick={() => setPage(current => current + 1)}><ChevronRight size={16}/></button>
        </div>
      </div>
    </section>
  );
}
