import type { MedicalCase } from "@/types";

export const demoUsers = [
  { id: 1, name: "Dr. Maya Rao", email: "admin@medmatch.test", password: "Admin@123", role: "ADMIN" as const },
  { id: 2, name: "Dr. Arjun Nair", email: "staff@medmatch.test", password: "Staff@123", role: "STAFF" as const },
];

const seeds = [
  ["Respiratory", "Persistent productive cough, fever, fatigue and shortness of breath", "Childhood asthma", "Crackles in right lower lung, oxygen saturation 93%", "Community-acquired pneumonia", "Oral antibiotics, hydration and rest", "WBC elevated, chest X-ray shows lower-lobe opacity"],
  ["Cardiology", "Central chest pressure radiating to left arm with sweating and nausea", "Hypertension and tobacco exposure", "Tachycardia with ST-segment changes", "Acute coronary syndrome", "Antiplatelet therapy and urgent cardiology evaluation", "Troponin elevated"],
  ["Neurology", "Recurring unilateral throbbing headache, light sensitivity and nausea", "Similar episodes during examinations", "Normal neurological examination", "Migraine with aura", "Triptan as needed, hydration and trigger management", "No focal deficit"],
  ["Endocrinology", "Increased thirst, frequent urination, tiredness and blurred vision", "Family history of diabetes", "BMI 29, mild dehydration", "Type 2 diabetes mellitus", "Metformin, diet counselling and activity plan", "Fasting glucose 168 mg/dL, HbA1c 7.8%"],
  ["Gastroenterology", "Burning upper abdominal pain, bloating and nausea after meals", "Frequent NSAID use", "Epigastric tenderness without guarding", "Gastritis", "Proton pump inhibitor and avoid NSAIDs", "Hemoglobin normal"],
  ["Respiratory", "Wheezing, chest tightness and night cough triggered by dust", "Atopy and seasonal allergies", "Diffuse expiratory wheeze", "Bronchial asthma exacerbation", "Inhaled bronchodilator and corticosteroid", "Peak flow reduced"],
  ["Infectious Disease", "High fever, severe body ache, headache and retro-orbital pain", "Recent mosquito exposure", "Rash and mild dehydration", "Dengue fever", "Oral fluids, paracetamol and platelet monitoring", "Platelets 105000/mm3"],
  ["Orthopedics", "Lower back pain radiating down right leg with tingling", "Desk work and prior lifting injury", "Positive straight-leg raise", "Lumbar radiculopathy", "Physiotherapy, activity modification and analgesia", "Motor power preserved"],
  ["Dermatology", "Itchy red scaly patches on elbows and knees", "Intermittent flares during stress", "Well-demarcated plaques with silvery scale", "Plaque psoriasis", "Topical corticosteroid and emollient", "No joint symptoms"],
  ["Nephrology", "Burning urination, urgency and lower abdominal discomfort", "Previous urinary infection", "Suprapubic tenderness, afebrile", "Uncomplicated urinary tract infection", "Short-course antibiotic and increased fluids", "Urinalysis positive for leukocytes and nitrites"],
  ["ENT", "Sore throat, fever, painful swallowing and tender neck nodes", "No chronic illness", "Tonsillar exudate without cough", "Streptococcal pharyngitis", "Penicillin course and supportive care", "Rapid antigen test positive"],
  ["Psychiatry", "Persistent low mood, poor sleep, low energy and loss of interest", "Academic stress for three months", "Cooperative, no psychosis, low immediate risk", "Major depressive episode", "Psychotherapy, safety plan and follow-up", "Thyroid function normal"],
] as const;

const firstNames = ["Aarav", "Diya", "Kabir", "Meera", "Rohan", "Ananya"];
export const demoCases: MedicalCase[] = Array.from({ length: 60 }, (_, index) => {
  const s = seeds[index % seeds.length];
  const age = 18 + ((index * 7) % 59);
  return {
    id: index + 1,
    caseCode: `MC-${String(index + 1).padStart(4, "0")}`,
    patientAge: age,
    patientGender: (["MALE", "FEMALE", "OTHER"] as const)[index % 3],
    category: s[0], symptoms: s[1], medicalHistory: s[2], clinicalObservations: s[3],
    diagnosis: s[4], treatment: s[5], notes: "Synthetic academic case. Similarity is for reference only.",
    createdAt: new Date(2026, 7, 26 - (index % 24)).toISOString(),
    createdBy: `Dr. ${firstNames[index % firstNames.length]}`,
    labResults: { summary: s[6], severityIndex: (index % 5) + 1 },
    examinationDetails: { general: index % 2 ? "Alert and oriented" : "Stable at assessment" },
  };
});

export const demoSearchHistory = [
  { id: 1, query: "persistent cough fever difficulty breathing", type: "Semantic", results: 8, date: "2026-08-27T09:42:00Z", user: "Dr. Arjun Nair" },
  { id: 2, query: "chest pressure sweating", type: "Hybrid", results: 5, date: "2026-08-26T14:15:00Z", user: "Dr. Maya Rao" },
  { id: 3, query: "headache light sensitivity", type: "Keyword", results: 7, date: "2026-08-25T11:05:00Z", user: "Dr. Arjun Nair" },
];
