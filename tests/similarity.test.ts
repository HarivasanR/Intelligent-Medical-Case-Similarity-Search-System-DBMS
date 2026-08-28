import { describe, expect, it } from "vitest";
import { cosineSimilarity, LocalHashEmbeddingService } from "@/services/embedding";
import { findSimilarDemo } from "@/services/cases";

describe("similarity search",()=>{
  it("returns identical vector similarity near one",async()=>{const e=new LocalHashEmbeddingService();const a=await e.embed("cough fever breathing");expect(cosineSimilarity(a,a)).toBeCloseTo(1,5)});
  it("ranks respiratory cases for cough and breathing query",async()=>{const items=await findSimilarDemo("persistent cough fever and difficulty breathing",5);expect(items.length).toBe(5);expect(items[0].category).toBe("Respiratory");expect(items[0].score).toBeGreaterThan(0.2)});
  it("applies structured filters",async()=>{const items=await findSimilarDemo("wheezing cough",8,{patientGender:"FEMALE"});expect(items.every(i=>i.patientGender==="FEMALE")).toBe(true)});
});
