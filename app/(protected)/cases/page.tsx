import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { CasesTable } from "@/components/cases-table";
import { demoCases } from "@/lib/demo-data";

export default function CasesPage() { return <><PageHeading eyebrow="Structured + document data" title="Medical case library" description="Browse synthetic cases stored across the relational record and flexible clinical documents." action={<Link href="/cases/new" className="btn-primary"><Plus size={17}/>Add medical case</Link>}/><CasesTable initialItems={demoCases}/></>; }
