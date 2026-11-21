import { notFound } from "next/navigation";
import { CaseForm } from "@/components/case-form";
import { PageHeading } from "@/components/page-heading";
import { demoCases } from "@/lib/demo-data";
import { isDemoMode } from "@/lib/utils";
import { getDatabaseCase } from "@/services/database-cases";

export default async function EditCase({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  const item = isDemoMode() ? demoCases.find(c => c.id === id) : await getDatabaseCase(id);
  if (!item) notFound();
  return <><PageHeading title={`Edit ${item.caseCode}`} description="Update the synthetic case and refresh its search index."/><CaseForm initialItem={item}/></>;
}
