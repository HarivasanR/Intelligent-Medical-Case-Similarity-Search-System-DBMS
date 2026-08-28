import Link from "next/link";
import { Activity, ClipboardList, History, LayoutDashboard, LogOut, Search, ShieldCheck, Stethoscope } from "lucide-react";
import { getSession } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { initials } from "@/lib/utils";

const links = [
  ["Dashboard", "/dashboard", LayoutDashboard], ["Medical cases", "/cases", ClipboardList], ["Similarity search", "/search", Search], ["Search history", "/history", History]
] as const;

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  return <div className="min-h-screen lg:grid lg:grid-cols-[250px_1fr]">
    <aside className="hidden border-r border-slate-200 bg-white px-5 py-6 lg:flex lg:flex-col">
      <Logo />
      <nav className="mt-10 space-y-1.5">{links.map(([label, href, Icon]) => <Link key={href} href={href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-teal-50 hover:text-teal-700"><Icon size={18}/>{label}</Link>)}</nav>
      {user?.role === "ADMIN" && <div className="mt-7"><div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">Administration</div><Link href="/admin" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-teal-50 hover:text-teal-700"><ShieldCheck size={18}/>Admin panel</Link></div>}
      <div className="mt-auto rounded-2xl bg-slate-900 p-4 text-white"><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-300"><Activity size={15}/>Academic use</div><p className="text-xs leading-5 text-slate-300">Similarity results support research and learning. They are not medical advice or diagnosis.</p></div>
    </aside>
    <div className="min-w-0">
      <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200/80 bg-white/90 px-5 backdrop-blur lg:px-8"><div className="flex items-center gap-3 lg:hidden"><Logo compact/><span className="font-extrabold">MedMatch</span></div><div className="hidden items-center gap-2 text-sm text-slate-500 lg:flex"><Stethoscope size={17} className="text-teal-600"/>Intelligent Medical Case Similarity & Search</div><div className="flex items-center gap-3"><div className="hidden text-right sm:block"><div className="text-sm font-bold">{user?.name}</div><div className="text-xs capitalize text-slate-500">{user?.role.toLowerCase()}</div></div><span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-100 text-sm font-extrabold text-teal-700">{initials(user?.name || "User")}</span><form action="/api/auth/logout" method="post"><button aria-label="Log out" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><LogOut size={18}/></button></form></div></header>
      <main className="p-5 lg:p-8">{children}</main>
      <nav className="fixed bottom-3 left-3 right-3 z-30 flex justify-around rounded-2xl border border-slate-200 bg-white p-2 shadow-xl lg:hidden">{links.slice(0,4).map(([label, href, Icon]) => <Link key={href} href={href} title={label} className="rounded-xl p-2.5 text-slate-500 hover:bg-teal-50 hover:text-teal-700"><Icon size={20}/></Link>)}</nav>
    </div>
  </div>;
}
