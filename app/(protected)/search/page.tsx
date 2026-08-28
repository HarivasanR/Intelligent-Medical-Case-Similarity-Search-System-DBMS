import { PageHeading } from "@/components/page-heading";
import { SimilaritySearch } from "@/components/similarity-search";
export default function SearchPage(){return <><PageHeading eyebrow="Qdrant vector retrieval" title="Find similar medical cases" description="Describe the clinical presentation in natural language. Results combine semantic similarity with lightweight keyword overlap and optional structured filters."/><SimilaritySearch/></>}
