import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { CasesTable } from "@/components/cases-table";
import { demoCases } from "@/lib/demo-data";
import { isDemoMode } from "@/lib/utils";
import { listDatabaseCasesPage } from "@/services/database-cases";

const PAGE_SIZE = 10;

export default async function CasesPage() {
  const data = isDemoMode()
    ? {
        items: demoCases.slice(0, PAGE_SIZE),
        total: demoCases.length,
        totalPages: Math.ceil(demoCases.length / PAGE_SIZE),
        categories: [...new Set(demoCases.map((item) => item.category))].sort(),
      }
    : await listDatabaseCasesPage({ page: 1, pageSize: PAGE_SIZE });

  return (
    <>
      <PageHeading
        eyebrow="Structured + document data"
        title="Medical case library"
        description="Browse synthetic cases stored across the relational record and flexible clinical documents."
        action={<Link href="/cases/new" className="btn-primary"><Plus size={17}/>Add medical case</Link>}
      />
      <CasesTable
        initialItems={data.items}
        initialTotal={data.total}
        initialTotalPages={data.totalPages}
        initialCategories={data.categories}
      />
    </>
  );
}
