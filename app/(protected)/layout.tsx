import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSession } from "@/lib/auth";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  if (!(await getSession())) redirect("/login");
  return <AppShell>{children}</AppShell>;
}
