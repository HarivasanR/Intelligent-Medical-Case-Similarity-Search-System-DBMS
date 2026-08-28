import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const caseSchema = z.object({
  patientAge: z.coerce.number().int().min(0).max(120),
  patientGender: z.enum(["MALE", "FEMALE", "OTHER"]),
  category: z.string().min(2).max(80),
  symptoms: z.string().min(10).max(4000),
  medicalHistory: z.string().max(4000).default(""),
  clinicalObservations: z.string().min(5).max(4000),
  diagnosis: z.string().min(2).max(255),
  treatment: z.string().min(2).max(4000),
  notes: z.string().max(4000).default(""),
  labResults: z.record(z.union([z.string(), z.number()])).default({}),
  examinationDetails: z.record(z.string()).default({}),
});

export const searchSchema = z.object({
  query: z.string().min(3).max(2000),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  category: z.string().optional(),
  minAge: z.coerce.number().min(0).max(120).optional(),
  maxAge: z.coerce.number().min(0).max(120).optional(),
  limit: z.coerce.number().int().min(1).max(20).default(8),
});
