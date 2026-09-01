import { describe, expect, it } from "vitest";
import { caseSchema, createUserSchema, loginSchema, searchSchema } from "@/lib/validation";

describe("input validation", () => {
  it("accepts a valid login", () =>
    expect(loginSchema.safeParse({ email: "staff@medmatch.test", password: "Staff@123" }).success).toBe(true));
  it("rejects an invalid login", () =>
    expect(loginSchema.safeParse({ email: "bad", password: "x" }).success).toBe(false));
  it("rejects an impossible patient age", () =>
    expect(
      caseSchema.safeParse({
        patientAge: 150,
        patientGender: "MALE",
        category: "Respiratory",
        symptoms: "Persistent cough and fever",
        medicalHistory: "",
        clinicalObservations: "Crackles present",
        diagnosis: "Pneumonia",
        treatment: "Antibiotics",
        notes: "",
        labResults: {},
        examinationDetails: {},
      }).success
    ).toBe(false));
  it("rejects an empty semantic query", () =>
    expect(searchSchema.safeParse({ query: "" }).success).toBe(false));
  it("accepts a valid new user with ADMIN role", () =>
    expect(
      createUserSchema.safeParse({
        fullName: "Dr. Maya Rao",
        email: "maya.rao@medmatch.test",
        password: "SecurePassword123",
        role: "ADMIN",
        isActive: true,
      }).success
    ).toBe(true));
  it("accepts a valid new user with STAFF role", () =>
    expect(
      createUserSchema.safeParse({
        fullName: "Dr. Arjun Nair",
        email: "arjun.nair@medmatch.test",
        password: "SecurePassword123",
        role: "STAFF",
        isActive: true,
      }).success
    ).toBe(true));
  it("rejects a user with invalid email", () =>
    expect(
      createUserSchema.safeParse({
        fullName: "Dr. Test",
        email: "not-an-email",
        password: "SecurePassword123",
        role: "STAFF",
        isActive: true,
      }).success
    ).toBe(false));
  it("rejects a user with too short password", () =>
    expect(
      createUserSchema.safeParse({
        fullName: "Dr. Test",
        email: "test@medmatch.test",
        password: "123",
        role: "STAFF",
        isActive: true,
      }).success
    ).toBe(false));
  it("rejects an invalid role", () =>
    expect(
      createUserSchema.safeParse({
        fullName: "Dr. Test",
        email: "test@medmatch.test",
        password: "SecurePassword123",
        role: "DOCTOR" as unknown as "STAFF",
        isActive: true,
      }).success
    ).toBe(false));
});

