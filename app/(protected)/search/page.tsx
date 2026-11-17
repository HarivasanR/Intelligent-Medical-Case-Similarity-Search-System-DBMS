import { PageHeading } from "@/components/page-heading";
import { SimilaritySearch } from "@/components/similarity-search";
export default function SearchPage(){return <><PageHeading eyebrow="Qdrant vector retrieval" title="Find similar medical cases" description="Describe symptoms and observations. Results use local text vectors and optional age, gender and category filters."/><SimilaritySearch/></>}
