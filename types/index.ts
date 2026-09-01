export type Role = "ADMIN" | "STAFF";
export type Gender = "MALE" | "FEMALE" | "OTHER";

export interface SessionUser { id: number; name: string; email: string; role: Role }

export interface ManagedUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt?: string;
}

export interface MedicalCase {
  id: number;
  caseCode: string;
  patientAge: number;
  patientGender: Gender;
  category: string;
  symptoms: string;
  medicalHistory: string;
  clinicalObservations: string;
  diagnosis: string;
  treatment: string;
  notes: string;
  createdAt: string;
  createdBy: string;
  labResults?: Record<string, string | number>;
  examinationDetails?: Record<string, string>;
}

export interface SimilarityResult extends MedicalCase {
  score: number;
  matchReason: string;
}
