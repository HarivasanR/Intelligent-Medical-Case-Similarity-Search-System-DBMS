import { getQdrant } from "../lib/qdrant";
import { demoCases } from "../lib/demo-data";
import { caseToSearchText } from "../services/cases";
import { embeddingService } from "../services/embedding";

async function main(){const client=getQdrant();const collection=process.env.QDRANT_COLLECTION||"medical_cases";const existing=await client.getCollections();if(!existing.collections.some(c=>c.name===collection))await client.createCollection(collection,{vectors:{size:embeddingService.dimensions,distance:"Cosine"}});const points=[];for(const item of demoCases)points.push({id:item.id,vector:await embeddingService.embed(caseToSearchText(item)),payload:{caseId:item.id,diagnosis:item.diagnosis,age:item.patientAge,gender:item.patientGender,category:item.category,date:item.createdAt}});await client.upsert(collection,{wait:true,points});console.log(`Indexed ${points.length} vectors in ${collection}.`)}
main().catch(e=>{console.error(e);process.exit(1)});
