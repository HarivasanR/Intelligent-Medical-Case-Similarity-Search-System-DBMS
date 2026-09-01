import fs from "fs";
import path from "path";

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const filePath = path.resolve(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim();
          if (process.env[key] === undefined) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}
loadEnv();

import { getQdrant } from "../lib/qdrant";
import { demoCases } from "../lib/demo-data";
import { caseToSearchText } from "../services/cases";
import { embeddingService } from "../services/embedding";

async function main(){const client=getQdrant();const collection=process.env.QDRANT_COLLECTION||"medical_cases";const existing=await client.getCollections();if(!existing.collections.some(c=>c.name===collection))await client.createCollection(collection,{vectors:{size:embeddingService.dimensions,distance:"Cosine"}});const points=[];for(const item of demoCases)points.push({id:item.id,vector:await embeddingService.embed(caseToSearchText(item)),payload:{caseId:item.id,diagnosis:item.diagnosis,age:item.patientAge,gender:item.patientGender,category:item.category,date:item.createdAt}});await client.upsert(collection,{wait:true,points});console.log(`Indexed ${points.length} vectors in ${collection}.`)}
main().catch(e=>{console.error(e);process.exit(1)});
