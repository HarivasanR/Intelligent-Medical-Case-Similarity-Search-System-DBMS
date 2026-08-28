import { describe, expect, it } from "vitest";
import { caseSchema, loginSchema, searchSchema } from "@/lib/validation";

describe("input validation",()=>{
  it("accepts a valid login",()=>expect(loginSchema.safeParse({email:"staff@medmatch.test",password:"Staff@123"}).success).toBe(true));
  it("rejects an invalid login",()=>expect(loginSchema.safeParse({email:"bad",password:"x"}).success).toBe(false));
  it("rejects an impossible patient age",()=>expect(caseSchema.safeParse({patientAge:150,patientGender:"MALE",category:"Respiratory",symptoms:"Persistent cough and fever",medicalHistory:"",clinicalObservations:"Crackles present",diagnosis:"Pneumonia",treatment:"Antibiotics",notes:"",labResults:{},examinationDetails:{}}).success).toBe(false));
  it("rejects an empty semantic query",()=>expect(searchSchema.safeParse({query:""}).success).toBe(false));
});
