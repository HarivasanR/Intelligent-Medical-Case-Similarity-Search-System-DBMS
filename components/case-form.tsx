"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { CASE_CATEGORIES } from "@/lib/utils";
import type { MedicalCase } from "@/types";

const example = {
  symptoms: "Persistent cough, fever and difficulty breathing",
  medicalHistory: "No known chronic disease; recent upper respiratory infection",
  clinicalObservations: "Mild tachypnoea and crackles at the right lung base",
  examinationDetails: "Oxygen saturation 93%; temperature 38.2 C",
  diagnosis: "Community-acquired pneumonia",
  treatment: "Oral antibiotics, hydration, rest and review in 48 hours",
  labResults: "WBC elevated; chest X-ray shows right lower-lobe opacity",
  notes: "Synthetic academic record for similarity-search demonstration",
};
const fields = [
  ["symptoms", "Symptoms"], ["medicalHistory", "Medical history"],
  ["clinicalObservations", "Clinical observations"], ["examinationDetails", "Flexible examination details (MongoDB)"],
  ["diagnosis", "Primary diagnosis"], ["treatment", "Treatment plan"],
  ["labResults", "Laboratory / report summary (MongoDB)"], ["notes", "Additional notes"],
] as const;

export function CaseForm({ initialItem }: { initialItem?: MedicalCase }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setMessage("");
    const data = new FormData(event.currentTarget);
    const text = (name: string) => String(data.get(name) ?? "");
    const body = {
      patientAge: Number(data.get("patientAge")), patientGender: text("patientGender"), category: text("category"),
      symptoms: text("symptoms"), medicalHistory: text("medicalHistory"), clinicalObservations: text("clinicalObservations"),
      diagnosis: text("diagnosis"), treatment: text("treatment"), notes: text("notes"),
      labResults: { ...initialItem?.labResults, summary: text("labResults") },
      examinationDetails: { ...initialItem?.examinationDetails, summary: text("examinationDetails") },
    };
    try {
      const response = await fetch(initialItem ? `/api/cases/${initialItem.id}` : "/api/cases", { method: initialItem ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) { setMessage(result.error); return; }
      if (result.demo) { setMessage("Demo case validated successfully. Use database mode to persist it."); return; }
      router.push(`/cases/${result.item.id}`); router.refresh();
    } catch { setMessage("Could not reach the server. Refresh the library before retrying a save."); }
    finally { setLoading(false); }
  }
  function initial(name: keyof typeof example) {
    if (!initialItem) return example[name];
    if (name === "labResults" || name === "examinationDetails") return String(initialItem[name]?.summary ?? "");
    return initialItem[name];
  }
  return <form onSubmit={submit} className="space-y-5">
    <section className="card p-6"><h2 className="text-lg font-extrabold">Patient information</h2><p className="mt-1 text-sm text-muted">Only anonymous demographic attributes are collected.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div><label className="label" htmlFor="patientAge">Age</label><input className="input" id="patientAge" name="patientAge" type="number" min="0" max="120" defaultValue={initialItem?.patientAge ?? 42} required/></div>
        <div><label className="label" htmlFor="patientGender">Gender</label><select className="input" id="patientGender" name="patientGender" defaultValue={initialItem?.patientGender ?? "FEMALE"}><option value="FEMALE">Female</option><option value="MALE">Male</option><option value="OTHER">Other</option></select></div>
        <div><label className="label" htmlFor="category">Case category</label><input className="input" id="category" name="category" list="case-categories" defaultValue={initialItem?.category ?? "Respiratory"} required/><datalist id="case-categories">{CASE_CATEGORIES.map(c => <option key={c} value={c}/>)}</datalist></div>
      </div>
    </section>
    <section className="card p-6"><h2 className="text-lg font-extrabold">Clinical information</h2><div className="mt-5 grid gap-4 lg:grid-cols-2">{fields.map(([name, label]) => <div key={name}><label className="label" htmlFor={name}>{label}</label><textarea className="input min-h-28 resize-y" id={name} name={name} defaultValue={initial(name)} required={!["medicalHistory", "notes", "labResults", "examinationDetails"].includes(name)}/></div>)}</div></section>
    {message && <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{message}</p>}
    <div className="flex justify-end"><button className="btn-primary" disabled={loading}><Save size={17}/>{loading ? "Saving…" : "Save and index case"}</button></div>
  </form>;
}
