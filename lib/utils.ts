import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
export function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}
export function initials(name: string) { return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase(); }

/** "demo" uses in-memory synthetic data; "database" uses MySQL + MongoDB + Qdrant. Server-side only. */
export function isDemoMode() { return (process.env.DATA_MODE || "demo") === "demo"; }

export const CASE_CATEGORIES = [
  "Cardiology", "Dermatology", "Endocrinology", "ENT", "Gastroenterology", "Infectious Disease",
  "Nephrology", "Neurology", "Orthopedics", "Psychiatry", "Respiratory",
];
