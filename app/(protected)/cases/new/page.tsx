import { PageHeading } from "@/components/page-heading";
import { CaseForm } from "@/components/case-form";
export default function NewCasePage(){return <><PageHeading eyebrow="Transaction workflow" title="Add a medical case" description="Structured fields are saved in MySQL, flexible clinical data in MongoDB, and the searchable representation is indexed in Qdrant."/><CaseForm/></>}
