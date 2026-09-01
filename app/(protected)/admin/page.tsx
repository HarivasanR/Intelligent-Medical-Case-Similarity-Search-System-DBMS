import { redirect } from "next/navigation";
import { Database, FileClock, ShieldCheck, UserCog } from "lucide-react";
import { getSession } from "@/lib/auth";
import { demoUsers } from "@/lib/demo-data";
import { PageHeading } from "@/components/page-heading";
import { AdminUserManagement } from "@/components/admin-user-management";
import { listDatabaseUsers } from "@/services/database-users";
import type { ManagedUser } from "@/types";

export default async function AdminPage() {
  const user = await getSession();
  if (user?.role !== "ADMIN") redirect("/dashboard");

  let initialUsers: ManagedUser[] = [];
  if ((process.env.DATA_MODE || "demo") === "demo") {
    initialUsers = demoUsers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: true,
    }));
  } else {
    try {
      initialUsers = await listDatabaseUsers();
    } catch {
      initialUsers = demoUsers.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        isActive: true,
      }));
    }
  }

  const cards = [
    ["Registered users", String(initialUsers.length || "8"), UserCog],
    ["Audit events", "247", FileClock],
    ["Database services", "3 / 3", Database],
  ] as const;

  return (
    <>
      <PageHeading
        eyebrow="Role-protected area"
        title="Administration"
        description="Manage access and inspect database activity. This page is available only to the Admin role."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map(([label, value, Icon]) => (
          <div className="card p-5" key={label}>
            <Icon className="text-teal-600" />
            <div className="mt-5 text-3xl font-extrabold">{value}</div>
            <div className="mt-1 text-sm text-muted">{label}</div>
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <AdminUserManagement
          initialUsers={initialUsers}
          currentUserId={user.id}
        />
        <section className="card p-5">
          <h2 className="font-extrabold">Database health</h2>
          <div className="mt-5 space-y-3">
            {[
              ["MySQL", "Structured system of record"],
              ["MongoDB", "Flexible clinical documents"],
              ["Qdrant", "384-d cosine vector index"],
            ].map(([name, desc]) => (
              <div
                key={name}
                className="flex items-center gap-3 rounded-xl border border-slate-100 p-3"
              >
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-teal-50 text-teal-600">
                  <ShieldCheck size={17} />
                </span>
                <div className="min-w-0">
                  <div className="font-bold">{name}</div>
                  <div className="truncate text-xs text-muted">{desc}</div>
                </div>
                <span className="ml-auto h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-5 text-muted">
            Demo mode reports the designed service topology. Run Docker Compose and set DATA_MODE=database for live connectivity.
          </p>
        </section>
      </div>
    </>
  );
}

