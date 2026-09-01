import Link from "next/link";
import { ArrowRight, ClipboardList, DatabaseZap, Search, Users } from "lucide-react";
import { demoCases } from "@/lib/demo-data";
import { formatDate } from "@/lib/utils";
import { PageHeading } from "@/components/page-heading";
import { getDatabaseDashboardStats } from "@/services/database-cases";
import type { MedicalCase } from "@/types";

export default async function DashboardPage() {
  const isDemo = (process.env.DATA_MODE || "demo") === "demo";

  let cases: MedicalCase[] = [];
  let totalCases = 0;
  let casesNote = "";
  let totalSearches = 0;
  let searchesNote = "";
  let clinicalDocs = 0;
  let clinicalDocsNote = "";
  let activeUsers = 0;
  let usersNote = "";

  if (isDemo) {
    cases = demoCases;
    totalCases = demoCases.length;
    casesNote = "+8 this month";
    totalSearches = 184;
    searchesNote = "12 today";
    clinicalDocs = demoCases.length;
    clinicalDocsNote = "MongoDB linked";
    activeUsers = 8;
    usersNote = "2 roles";
  } else {
    try {
      const stats = await getDatabaseDashboardStats();
      cases = stats.cases;
      totalCases = stats.totalCases;
      casesNote = `+${stats.casesThisMonth} this month`;
      totalSearches = stats.totalSearches;
      searchesNote = `${stats.searchesToday} today`;
      clinicalDocs = stats.clinicalDocuments;
      clinicalDocsNote = "MongoDB linked";
      activeUsers = stats.activeUsers;
      usersNote = `${stats.activeRoles} role${stats.activeRoles === 1 ? "" : "s"}`;
    } catch (error) {
      console.error("Failed to load dashboard statistics from database:", error);
      cases = [];
      totalCases = 0;
      casesNote = "0 this month";
      totalSearches = 0;
      searchesNote = "0 today";
      clinicalDocs = 0;
      clinicalDocsNote = "MongoDB linked";
      activeUsers = 0;
      usersNote = "0 roles";
    }
  }

  const categoryMap = cases.reduce<Record<string, number>>((acc, c) => {
    acc[c.category] = (acc[c.category] || 0) + 1;
    return acc;
  }, {});
  const categories = Object.entries(categoryMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const topCategoryCount = categories[0]?.[1] || 1;

  const stats = [
    ["Total cases", totalCases, ClipboardList, casesNote],
    ["Semantic searches", totalSearches, Search, searchesNote],
    ["Clinical documents", clinicalDocs, DatabaseZap, clinicalDocsNote],
    ["Active users", activeUsers, Users, usersNote],
  ] as const;

  const recentCases = cases.slice(0, 6);

  return (
    <>
      <PageHeading
        eyebrow="Clinical intelligence workspace"
        title="Good morning, Doctor"
        description="A concise overview of the synthetic case library, search activity, and database health."
        action={
          <Link href="/search" className="btn-primary">
            <Search size={17} />
            Find similar cases
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(([label, value, Icon, note]) => (
          <div className="card p-5" key={label}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-muted">{label}</p>
                <p className="mt-2 text-3xl font-extrabold">{value}</p>
              </div>
              <span className="rounded-xl bg-teal-50 p-2.5 text-teal-600">
                <Icon size={21} />
              </span>
            </div>
            <p className="mt-4 text-xs font-semibold text-teal-700">{note}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <section className="card p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-extrabold">Recent medical cases</h2>
              <p className="mt-1 text-xs text-muted">Latest additions across categories</p>
            </div>
            <Link className="text-sm font-bold text-teal-700" href="/cases">
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="pb-3">Case</th>
                  <th className="pb-3">Diagnosis</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentCases.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3">
                      <Link href={`/cases/${item.id}`} className="font-bold text-teal-700">
                        {item.caseCode}
                      </Link>
                      <div className="text-xs text-slate-500">
                        {item.patientAge} yrs · {item.patientGender.toLowerCase()}
                      </div>
                    </td>
                    <td className="py-3 font-semibold">{item.diagnosis}</td>
                    <td className="py-3">
                      <span className="badge bg-slate-100 text-slate-600">{item.category}</span>
                    </td>
                    <td className="py-3 text-slate-500">{formatDate(item.createdAt)}</td>
                  </tr>
                ))}
                {recentCases.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-xs text-slate-500">
                      No cases found in the database.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        <section className="card p-5">
          <h2 className="font-extrabold">Cases by category</h2>
          <p className="mt-1 text-xs text-muted">Distribution in current dataset</p>
          <div className="mt-6 space-y-5">
            {categories.map(([name, value], i) => (
              <div key={name}>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="font-semibold">{name}</span>
                  <span className="text-muted">{value}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-teal-500"
                    style={{
                      width: `${Math.max(18, (value / topCategoryCount) * 100)}%`,
                      opacity: 1 - i * 0.11,
                    }}
                  />
                </div>
              </div>
            ))}
            {categories.length === 0 && (
              <p className="py-4 text-xs text-slate-500">No category data available.</p>
            )}
          </div>
          <Link href="/cases" className="mt-7 flex items-center gap-2 text-sm font-bold text-teal-700">
            Explore case library <ArrowRight size={15} />
          </Link>
        </section>
      </div>
    </>
  );
}
