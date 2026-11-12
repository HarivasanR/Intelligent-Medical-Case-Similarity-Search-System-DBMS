import { redirect } from "next/navigation";
import { Database, FileClock, ShieldCheck, UserCog } from "lucide-react";
import { getSession } from "@/lib/auth";
import { demoUsers } from "@/lib/demo-data";
import { isDemoMode } from "@/lib/utils";
import { PageHeading } from "@/components/page-heading";
import { AdminUserManagement } from "@/components/admin-user-management";
import { listDatabaseUsers } from "@/services/database-users";
import { checkDatabaseHealth, type ServiceHealth } from "@/services/database-cases";
import type { ManagedUser } from "@/types";

export default async function AdminPage() {
  const user = await getSession();
  if (user?.role !== "ADMIN") redirect("/dashboard");

  const isDemo = isDemoMode();
  let initialUsers: ManagedUser[] = [];
  // Demo mode shows the designed topology; database mode pings each service for real.
  let services: ServiceHealth[] = [
    { name: "MySQL", description: "Structured system of record", online: true },
    { name: "MongoDB", description: "Flexible clinical documents", online: true },
    { name: "Qdrant", description: "384-d cosine vector index", online: true },
  ];
  let auditEvents: number | null = 247;
  if (isDemo) {
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
    } catch (error) {
      console.error("Failed to list users:", error);
    }
    ({ services, auditEvents } = await checkDatabaseHealth());
  }

  const cards = [
    ["Registered users", String(initialUsers.length), UserCog],
    ["Audit events", auditEvents === null ? "—" : String(auditEvents), FileClock],
    ["Database services", `${services.filter((s) => s.online).length} / ${services.length}`, Database],
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
            {services.map(({ name, description: desc, online }) => (
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
                <span
                  title={online ? "Online" : "Offline"}
                  className={`ml-auto h-2.5 w-2.5 rounded-full ${online ? "bg-emerald-500" : "bg-rose-500"}`}
                />
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-5 text-muted">
            {isDemo
              ? "Demo mode reports the designed service topology. Run Docker Compose and set DATA_MODE=database for live connectivity."
              : "Live status: each database was pinged when this page loaded."}
          </p>
        </section>
      </div>
    </>
  );
}

