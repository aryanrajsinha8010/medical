import React, { useState, useMemo } from "react";
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  QrCode,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import designTokens from "../../design-tokens.json";
import { UITranslations } from "../i18n/translations";
import { Button, ConfidenceRing, SCHEME_MEANING, Term, buttonClass, inr } from "./ui";

/* ------------------------------------------------------------------ 1. Look up government rates */

export function RatesPage({
  rates,
  search,
  setSearch,
  scheme,
  setScheme,
}: {
  rates: any[];
  search: string;
  setSearch: (s: string) => void;
  scheme: string;
  setScheme: (s: string) => void;
}) {
  const schemes = ["", "CGHS", "PM-JAY", "NPPA", "MJPJAY"];
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");
  const [tierPreview, setTierPreview] = React.useState<"X" | "Y" | "Z">("X");
  const [nabhPreview, setNabhPreview] = React.useState<boolean>(true);

  const quickQueries = [
    { label: "All 87 rates", q: "" },
    { label: "Craniectomy / Neurosurgery", q: "Craniectomy" },
    { label: "Fungal / Aspergillus Lab", q: "Fungus" },
    { label: "Heart Stent & Bypass", q: "Stent" },
    { label: "Full Body Checkup", q: "Full Body" },
    { label: "Room Rent & ICU", q: "Room" },
    { label: "Emergency / Casualty", q: "Emergency" },
    { label: "Paracetamol / Tramadol", q: "Tablet" },
  ];

  const categories = [
    { id: "all", label: "All categories" },
    { id: "investigation", label: "Lab & Diagnostic" },
    { id: "package", label: "Surgery Packages" },
    { id: "procedure", label: "Procedures & ER" },
    { id: "pharmacy", label: "Medicines (NPPA / Jan Aushadhi)" },
    { id: "implant", label: "Implants & Stents" },
    { id: "room_rent", label: "Room & ICU Rent" },
    { id: "consultation", label: "Consultations" },
  ];

  const filteredRates = rates.filter((r) => {
    if (selectedCategory !== "all" && r.category !== selectedCategory) return false;
    return true;
  });

  const computeAdjustedRate = (r: any) => {
    let base = Number(r.rate || 0);
    if (r.scheme === "CGHS" && r.category !== "room_rent") {
      if (tierPreview === "Y") base *= 0.9;
      if (tierPreview === "Z") base *= 0.8;
      if (!nabhPreview) base *= 0.85;
    }
    return Math.round(base * 100) / 100;
  };

  return (
    <section data-testid="govt-rates-tab" className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-saffron-ink">
            Official Government Rate & Generic Drug Intelligence (87 Verified Benchmarks)
          </p>
          <h1 className="font-display text-2xl sm:text-3xl mt-0.5">
            What the government sets for surgeries, lab tests, rooms & medicines
          </h1>
          <p className="text-sm text-muted mt-1 max-w-2xl">
            Search by procedure name, medical abbreviation (“CBC”, “PTCA”, “KOH”), brand name (“Dolo”, “Shelcal”), ICD-10/LOINC code, or Hindi term. Every rate carries its official circular and portal link.
          </p>
        </div>

        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-muted" />
          <input
            type="search"
            data-testid="rates-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search 87 rates: “Craniectomy”, “Fungus”, “Stent”, “LB206”…"
            className="w-full min-h-[48px] pl-10 pr-3.5 rounded-xl border border-line bg-card text-sm"
          />
        </div>
      </div>

      {/* 1-Click Quick Search Chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-bold uppercase tracking-wider text-muted mr-1">Popular lookups:</span>
        {quickQueries.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => {
              setSelectedCategory("all");
              setScheme("");
              setSearch(item.q);
            }}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition ${
              search === item.q && selectedCategory === "all"
                ? "bg-saffron text-ink border-saffron font-bold"
                : "bg-card text-muted hover:text-ink border-line"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Scheme filter pills + Live City Tier / NABH Adjuster */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-line shadow-sm">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter by scheme">
          {schemes.map((s) => {
            const active = scheme === s;
            return (
              <button
                key={s || "all"}
                type="button"
                onClick={() => setScheme(s)}
                className={`min-h-[38px] px-3.5 rounded-full text-xs font-bold border transition ${
                  active ? "bg-brand text-[rgb(var(--on-brand))] border-brand" : "bg-paper border-line hover:border-brand/50"
                }`}
              >
                {s || "All schemes (87)"}
              </button>
            );
          })}
        </div>

        {/* Interactive CGHS Tier & NABH Calculator */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold text-muted">CGHS Tier & Accreditation Adjuster:</span>
          {(["X", "Y", "Z"] as const).map((tr) => (
            <button
              key={tr}
              type="button"
              onClick={() => setTierPreview(tr)}
              className={`px-2.5 py-1 rounded-lg font-bold border transition ${
                tierPreview === tr ? "bg-ink text-paper border-ink" : "bg-paper text-muted border-line"
              }`}
            >
              Tier {tr} {tr === "X" ? "(Metro 100%)" : tr === "Y" ? "(-10%)" : "(-20%)"}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setNabhPreview(!nabhPreview)}
            className={`px-2.5 py-1 rounded-lg font-bold border transition ${
              nabhPreview ? "bg-ok-soft text-ok border-ok/30" : "bg-warn-soft text-warn border-warn/30"
            }`}
          >
            {nabhPreview ? "NABH / NABL (100%)" : "Non-NABH (-15%)"}
          </button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter by clinical category">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
              selectedCategory === cat.id
                ? "bg-ink text-paper border-ink"
                : "bg-card text-muted hover:text-ink border-line"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Desktop table + mobile cards */}
      <div className="bg-card rounded-2xl border border-line shadow-paper overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wider text-muted bg-paper/60">
                <th className="py-3.5 px-4">Treatment, diagnostic test or medicine</th>
                <th className="py-3.5 px-4">Scheme, code & clinical ID</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4 text-right">Official rate ({tierPreview})</th>
                <th className="py-3.5 px-4">Source circular & generic alternative</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredRates.map((r) => {
                const adjRate = computeAdjustedRate(r);
                return (
                  <tr key={r.rate_id} className="hover:bg-paper/50 transition">
                    <td className="py-3.5 px-4 max-w-md">
                      <div className="font-semibold text-ink">{r.name}</div>
                      {r.canonical_name_hi && <div className="text-xs text-muted">{r.canonical_name_hi}</div>}
                      {r.plain_description_en && (
                        <div className="text-xs text-muted mt-1 leading-relaxed">{r.plain_description_en}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div>
                        <span className="px-2 py-0.5 rounded-md bg-brand-soft text-xs font-bold">
                          <Term meaning={SCHEME_MEANING[r.scheme] || r.scheme}>{r.scheme}</Term>
                        </span>{" "}
                        <span className="font-mono text-xs font-semibold text-ink">{r.code}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {r.icd10_code && (
                          <span className="px-1.5 py-0.5 rounded bg-paper border border-line font-mono text-[10px] text-muted">
                            ICD-10: {r.icd10_code}
                          </span>
                        )}
                        {r.loinc_code && (
                          <span className="px-1.5 py-0.5 rounded bg-paper border border-line font-mono text-[10px] text-muted">
                            LOINC: {r.loinc_code}
                          </span>
                        )}
                        {r.atc_code && (
                          <span className="px-1.5 py-0.5 rounded bg-paper border border-line font-mono text-[10px] text-muted">
                            ATC: {r.atc_code}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs capitalize text-muted">
                      {String(r.category || "").replace("_", " ")}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="font-bold text-ok tnum text-base">{inr(adjRate)}</div>
                      {adjRate !== Number(r.rate) && (
                        <div className="text-[11px] text-muted tnum">Base Tier-X: {inr(r.rate)}</div>
                      )}
                      {r.janaushadhi_mrp && (
                        <div className="mt-1 inline-block px-2 py-0.5 rounded bg-ok-soft text-ok text-[11px] font-bold tnum">
                          Jan Aushadhi MRP: {inr(r.janaushadhi_mrp)}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-muted">
                      <div className="text-ink font-medium">{r.page_ref}</div>
                      {r.generic_name && (
                        <div className="text-[11px] text-ok font-semibold mt-0.5">
                          PMBI Generic ({r.janaushadhi_drug_code}): {r.generic_name}
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        <span>From {r.effective_from}</span>
                        {r.source_url && (
                          <a
                            href={r.source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-semibold text-saffron-ink underline"
                          >
                            Official site <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredRates.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-muted">
                    Nothing matched “{search}”. Try “Craniectomy”, “Fungus”, “Room”, “CBC”, or “Stent”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ 2. Plan a treatment + insurer check */

export const COMMON_PROCEDURES = [
  { id: "TERM_PKG_LAP_CHOLE", label: "Gallbladder Removal (Laparoscopic Cholecystectomy)", cat: "General Surgery" },
  { id: "TERM_PKG_PTCA", label: "Heart Angioplasty with Stent (PTCA)", cat: "Cardiology" },
  { id: "TERM_PKG_CABG", label: "Heart Bypass Surgery (CABG / Open Heart)", cat: "Cardiology" },
  { id: "TERM_PKG_CRANIECTOMY", label: "Craniectomy / Brain Surgery (Decompressive Craniotomy)", cat: "Neurosurgery" },
  { id: "TERM_PKG_LSCS", label: "Caesarean Delivery (C-Section / LSCS Package)", cat: "Obstetrics" },
  { id: "TERM_PKG_CATARACT", label: "Cataract Surgery with Foldable IOL (Phaco)", cat: "Ophthalmology" },
  { id: "TERM_PKG_TKR", label: "Knee Replacement (Unilateral Primary TKR)", cat: "Orthopaedics" },
  { id: "TERM_PKG_APPENDICECTOMY", label: "Appendix Removal (Laparoscopic Appendicectomy)", cat: "General Surgery" },
  { id: "TERM_PKG_HERNIA", label: "Hernia Repair with Mesh (Hernioplasty)", cat: "General Surgery" },
  { id: "TERM_PKG_HYSTERECTOMY", label: "Uterus Removal (Total Laparoscopic Hysterectomy)", cat: "Gynaecology" },
  { id: "TERM_PROC_CAG", label: "Coronary Angiography (CAG Cardiac Cath)", cat: "Cardiology" },
  { id: "TERM_PROC_TURP", label: "Prostate Surgery (TURP Endoscopic Resection)", cat: "Urology" },
  { id: "TERM_PKG_NORMAL_DELIVERY", label: "Normal Vaginal Delivery (Maternity Package)", cat: "Obstetrics" },
  { id: "TERM_PROC_COLONOSCOPY", label: "Colonoscopy (Lower GI Endoscopy)", cat: "Gastroenterology" },
  { id: "TERM_PROC_ENDOSCOPY", label: "Upper GI Endoscopy (Diagnostic OGD)", cat: "Gastroenterology" },
  { id: "TERM_PROC_HEMODIALYSIS", label: "Dialysis Session (Single Hemodialysis)", cat: "Nephrology" },
  { id: "TERM_IMPLANT_STENT_DES", label: "Drug-Eluting Heart Stent (NPPA Statutory Price Cap)", cat: "Medical Devices" },
  { id: "TERM_IMPLANT_KNEE_PRIMARY", label: "Primary Knee Replacement Implant Set (NPPA DPCO Cap)", cat: "Medical Devices" },
  { id: "TERM_PKG_FULL_BODY_CHECKUP", label: "Preventive Full Body Checkup with Vitamin Screening", cat: "Preventive Health" },
];

export const PROCEDURE_BENCHMARKS: Record<string, {
  name: string;
  name_hi: string;
  category: "package" | "procedure" | "implant" | "investigation";
  baseRate: number;
  scheme: string;
  code: string;
  icd10: string;
  recommendedDays: number;
  inclusions: string[];
  exclusions: string[];
  disclaimer?: string;
}> = {
  TERM_PKG_LAP_CHOLE: {
    name: "Laparoscopic Cholecystectomy (Gallbladder Removal Surgery Package)",
    name_hi: "लेप्रोस्कोपिक पित्ताशय की सर्जरी (Lap Cholecystectomy)",
    category: "package",
    baseRate: 25300,
    scheme: "CGHS",
    code: "CGHS-SURG-345",
    icd10: "K80.20",
    recommendedDays: 3,
    inclusions: [
      "Surgeon and Assistant Surgical Team Fees",
      "Operation Theatre (OT) Facility Charges & Laparoscopic Consumables",
      "Anesthesia Charges and Anesthetic Gases/Monitoring",
      "Routine in-hospital nursing & standard ward stay up to package days",
      "Standard pre-op and immediate post-op medications during permitted stay",
    ],
    exclusions: [
      "Specialized high-end implants (unless explicitly coded in the package)",
      "Non-routine blood transfusions or ICU complications exceeding standard stay",
      "Discharge take-home outpatient pharmacy",
    ],
  },
  TERM_PKG_PTCA: {
    name: "Coronary Angioplasty (PTCA - Single Stent Procedure Package)",
    name_hi: "कोरोनरी एंजियोप्लास्टी पैकेज (PTCA Angioplasty)",
    category: "package",
    baseRate: 57500,
    scheme: "CGHS",
    code: "CGHS-CARD-502",
    icd10: "I25.10",
    recommendedDays: 2,
    inclusions: [
      "Cath Lab facility charges and cardiac interventional team fees",
      "Balloon catheter and routine PTCA disposables",
      "Anesthesia and immediate post-cath monitoring",
      "Routine in-hospital nursing & standard stay up to 2 days",
    ],
    exclusions: [
      "Drug-Eluting Stents (billed under statutory NPPA ceiling cap of ₹38,265)",
      "Non-routine emergency mechanical circulatory support (IABP/ECMO)",
    ],
  },
  TERM_PKG_CABG: {
    name: "Coronary Artery Bypass Graft Surgery (CABG / Open Heart Bypass)",
    name_hi: "कोरोनरी बाईपास सर्जरी पैकेज (CABG Heart Bypass)",
    category: "package",
    baseRate: 161000,
    scheme: "CGHS",
    code: "CTVS-510",
    icd10: "I25.10",
    recommendedDays: 8,
    inclusions: [
      "Cardiac surgeon, perfusionist, and cardiac anesthesia team fees",
      "Heart-Lung Machine (CPB) facility charges and cardioplegia",
      "Standard sternotomy consumables and surgical staples",
      "Up to 8 days stay including initial post-op Cardiac ICU monitoring",
    ],
    exclusions: [
      "Specialized blood components (platelets/FFP) exceeding package allocation",
      "Post-discharge rehabilitation consultations",
    ],
  },
  TERM_PKG_CRANIECTOMY: {
    name: "Craniectomy / Brain Surgery (Decompressive Craniotomy)",
    name_hi: "क्रेनिएक्टॉमी मस्तिष्क सर्जरी (Decompressive Craniotomy)",
    category: "package",
    baseRate: 58300,
    scheme: "CGHS",
    code: "NEURO-701",
    icd10: "G93.5",
    recommendedDays: 8,
    inclusions: [
      "Neurosurgeon and neuro-anesthesia surgical charges",
      "Neuro OT facility, craniotome drill, and standard dural closure",
      "Standard ICU neuro-monitoring and routine nursing",
    ],
    exclusions: [
      "Cranial titanium mesh / synthetic flap reconstruction (cranioplasty)",
      "Extended ventilator stay exceeding clinical protocol",
    ],
  },
  TERM_PKG_LSCS: {
    name: "Caesarean Delivery (C-Section / LSCS Package)",
    name_hi: "सिजेरियन ऑपरेशन प्रसव (LSCS Maternity Package)",
    category: "package",
    baseRate: 20700,
    scheme: "CGHS",
    code: "CGHS-OBS-102",
    icd10: "O82",
    recommendedDays: 3,
    inclusions: [
      "Obstetrician, assistant surgeon, and pediatrician attendance at birth",
      "Labor OT charges, spinal anesthesia, and standard suture materials",
      "Routine postpartum nursing and neonatal primary check",
    ],
    exclusions: [
      "Neonatal Intensive Care (NICU) incubator stay if medically indicated",
      "Non-routine maternal blood transfusions",
    ],
  },
  TERM_PKG_CATARACT: {
    name: "Cataract Surgery with Foldable IOL (Phacoemulsification)",
    name_hi: "मोतियाबिंद फेको सर्जरी (Cataract with Foldable IOL)",
    category: "package",
    baseRate: 11500,
    scheme: "CGHS",
    code: "OPH-204",
    icd10: "H25.9",
    recommendedDays: 1,
    inclusions: [
      "Ophthalmic surgeon fees and microsurgical OT charges",
      "Standard foldable Intraocular Lens (IOL) implant",
      "Viscoelastic substance and disposable ophthalmic drape/blades",
      "Same-day daycare recovery and post-op examination",
    ],
    exclusions: [
      "Premium multifocal or toric lenses requested outside government standard",
    ],
  },
  TERM_PKG_TKR: {
    name: "Knee Replacement (Unilateral Primary TKR)",
    name_hi: "घुटना प्रत्यारोपण सर्जरी (Total Knee Replacement)",
    category: "package",
    baseRate: 69000,
    scheme: "CGHS",
    code: "ORTHO-410",
    icd10: "M17.1",
    recommendedDays: 5,
    inclusions: [
      "Orthopaedic joint replacement surgeon & anesthesia charges",
      "Orthopaedic laminar-flow OT facility & bone cement",
      "Standard inpatient stay and initial physical therapy initiation",
    ],
    exclusions: [
      "Primary Knee Implant set (statutory ceiling cap under NPPA DPCO: ₹62,770)",
      "High-end robotic navigation disposables",
    ],
  },
  TERM_PKG_APPENDICECTOMY: {
    name: "Appendix Removal (Laparoscopic Appendicectomy)",
    name_hi: "अपेंडिक्स ऑपरेशन (Laparoscopic Appendicectomy)",
    category: "package",
    baseRate: 20900,
    scheme: "CGHS",
    code: "CGHS-SURG-312",
    icd10: "K35.80",
    recommendedDays: 3,
    inclusions: [
      "General surgeon and anesthesia fees",
      "Laparoscopy tower charges, trocars, and endo-loop ligatures",
      "Inpatient stay up to 3 days and routine recovery medication",
    ],
    exclusions: [
      "Complicated peritonitis requiring open laparotomy and prolonged drainage",
    ],
  },
  TERM_PKG_HERNIA: {
    name: "Hernia Repair with Mesh (Hernioplasty)",
    name_hi: "हर्निया ऑपरेशन जाली सहित (Hernia Mesh Repair)",
    category: "package",
    baseRate: 28500,
    scheme: "CGHS",
    code: "CGHS-SURG-330",
    icd10: "K40.90",
    recommendedDays: 3,
    inclusions: [
      "Surgeon fee and Operation Theatre charges",
      "Standard polypropylene surgical mesh implant",
      "Routine pre-op workup and 3 days ward stay",
    ],
    exclusions: [
      "Specialized composite biological / dual-surface anti-adhesion mesh",
    ],
  },
  TERM_PKG_HYSTERECTOMY: {
    name: "Uterus Removal (Total Laparoscopic Hysterectomy - TLH)",
    name_hi: "गर्भाशय निकालने का ऑपरेशन (Total Laparoscopic Hysterectomy)",
    category: "package",
    baseRate: 25243,
    scheme: "CGHS",
    code: "GYN-301",
    icd10: "N85.9",
    recommendedDays: 3,
    inclusions: [
      "Gynaecologist surgeon and anesthesia charges",
      "Advanced laparoscopic vessel sealing (bipolar/ultrasonic) and OT",
      "Standard post-op stay and histopathology biopsy of resected tissue",
    ],
    exclusions: [
      "Extended stay for complex pelvic adhesions or oncological staging",
    ],
  },
  TERM_PROC_CAG: {
    name: "Coronary Angiography (CAG Diagnostic Cath)",
    name_hi: "कोरोनरी एंजियोग्राफी जांच (Coronary Angiography)",
    category: "procedure",
    baseRate: 14750,
    scheme: "CGHS",
    code: "CGHS-CARD-501",
    icd10: "I25.10",
    recommendedDays: 1,
    inclusions: [
      "Cardiologist diagnostic fee and Cath Lab facility access",
      "Diagnostic catheter, sheath, guidewire, and radiographic contrast dye",
      "Daycare recovery bed and post-puncture monitoring",
    ],
    exclusions: [
      "Therapeutic angioplasty or stent deployment (billed separately under PTCA)",
    ],
  },
  TERM_PROC_TURP: {
    name: "Prostate Surgery (TURP Endoscopic Resection)",
    name_hi: "प्रोस्टेट दूरबीन ऑपरेशन (TURP Resection)",
    category: "procedure",
    baseRate: 63000,
    scheme: "CGHS",
    code: "NU059",
    icd10: "N40.1",
    recommendedDays: 3,
    inclusions: [
      "Urologist surgeon fee and endoscopic resectoscope OT",
      "Continuous bladder irrigation fluids and catheterization set",
      "Inpatient stay up to 3 days and post-procedure monitoring",
    ],
    exclusions: [
      "Laser prostate enucleation (HoLEP/ThuLEP) premium fiber consumables",
    ],
  },
  TERM_PKG_NORMAL_DELIVERY: {
    name: "Normal Vaginal Delivery (Maternity Package)",
    name_hi: "सामान्य प्रसव डिलीवरी पैकेज (Normal Delivery)",
    category: "package",
    baseRate: 35000,
    scheme: "CGHS",
    code: "OG002",
    icd10: "O80",
    recommendedDays: 2,
    inclusions: [
      "Obstetrician delivery fee and labor room monitoring",
      "Pediatrician primary examination and initial immunization",
      "Mother and infant in-hospital stay and dietary care",
    ],
    exclusions: [
      "Epidural painless labor analgesia (if elected by patient)",
    ],
  },
  TERM_PROC_COLONOSCOPY: {
    name: "Colonoscopy (Lower GI Endoscopy)",
    name_hi: "कोलोनोस्कोपी बड़ी आंत जांच (Colonoscopy)",
    category: "procedure",
    baseRate: 6000,
    scheme: "CGHS",
    code: "MG002",
    icd10: "Z12.11",
    recommendedDays: 1,
    inclusions: [
      "Gastroenterologist endoscopic procedure fee",
      "Video colonoscopy suite and endoscopic biopsy forceps",
      "Daycare observation following conscious sedation",
    ],
    exclusions: [
      "Therapeutic polypectomy or endoscopic mucosal resection (EMR)",
      "Histopathology laboratory report charges for biopsy samples",
    ],
  },
  TERM_PROC_ENDOSCOPY: {
    name: "Upper GI Endoscopy (Diagnostic OGD)",
    name_hi: "अपर जीआई एंडोस्कोपी (Upper GI Gastroscopy)",
    category: "procedure",
    baseRate: 4000,
    scheme: "CGHS",
    code: "MG001",
    icd10: "K29.70",
    recommendedDays: 1,
    inclusions: [
      "Endoscopist consultation and video gastroscopy suite",
      "Topical pharyngeal anesthesia and diagnostic mucosal inspection",
      "Daycare recovery bed and post-sedation monitoring",
    ],
    exclusions: [
      "Endoscopic variceal ligation (EVL bands) or therapeutic clip application",
    ],
  },
  TERM_PROC_HEMODIALYSIS: {
    name: "Dialysis Session (Single Hemodialysis Sero-Negative)",
    name_hi: "हीमोडायलिसिस सेशन (Single Sitting Dialysis)",
    category: "procedure",
    baseRate: 2500,
    scheme: "CGHS",
    code: "NU122",
    icd10: "Z99.2",
    recommendedDays: 1,
    inclusions: [
      "Hemodialysis machine slot and nephrology technician oversight",
      "Dialyzer cartridge, blood tubing set, and bicarbonate dialysate concentrate",
      "Heparin anticoagulant and routine saline flushes",
    ],
    exclusions: [
      "Erythropoietin (EPO) injection or intravenous iron supplementation",
      "Vascular access surgery (AV Fistula creation)",
    ],
  },
  TERM_IMPLANT_STENT_DES: {
    name: "Drug-Eluting Heart Stent (NPPA Statutory Price Cap)",
    name_hi: "ड्रग-एल्यूटिंग कोरोनरी स्टेंट (NPPA DPCO Stent Cap)",
    category: "implant",
    baseRate: 38265,
    scheme: "NPPA",
    code: "NPPA-DES-2025",
    icd10: "Z95.5",
    recommendedDays: 1,
    inclusions: [
      "Statutory maximum ceiling price under NPPA DPCO 2013 for Coronary DES",
      "All duties, sterilization packaging, and delivery to hospital Cath Lab",
      "Mandatory invoice traceability with batch and serial tracking",
    ],
    exclusions: [
      "Cath Lab surgical deployment and guide catheter (billed under PTCA)",
    ],
  },
  TERM_IMPLANT_KNEE_PRIMARY: {
    name: "Primary Knee Replacement Implant Set (NPPA DPCO Cap)",
    name_hi: "प्राइमरी घुटना इम्प्लांट सेट (NPPA DPCO Knee Cap)",
    category: "implant",
    baseRate: 62770,
    scheme: "NPPA",
    code: "NPPA-TKR-SET",
    icd10: "Z96.65",
    recommendedDays: 1,
    inclusions: [
      "Statutory maximum ceiling price under NPPA DPCO for complete knee set",
      "Femoral component, tibial tray, poly insert, and patellar button",
      "Sterile packaging and manufacturer traceability paperwork",
    ],
    exclusions: [
      "Surgical replacement OT and surgeon fee (billed under TKR package)",
    ],
  },
  TERM_PKG_FULL_BODY_CHECKUP: {
    name: "Preventive Full Body Checkup with Vitamin Screening",
    name_hi: "संपूर्ण स्वास्थ्य जांच पैकेज (Full Body Checkup)",
    category: "investigation",
    baseRate: 2500,
    scheme: "CGHS",
    code: "CGHS-MHC-2011",
    icd10: "Z00.00",
    recommendedDays: 1,
    inclusions: [
      "Complete Blood Count (CBC), Kidney Function (KFT), Liver Function (LFT)",
      "Lipid Profile, HbA1c 3-Month Sugar, Urine Routine, and Thyroid TFT",
      "Vitamin D3 and Vitamin B12 screening with physician review",
    ],
    exclusions: [
      "Advanced MRI or PET-CT whole body imaging",
    ],
  },
};

export function EstimatorPage({
  term,
  setTerm,
  result,
  cityTier,
  setCityTier,
  nabhAccredited,
  setNabhAccredited,
  wardType,
  setWardType,
  stayDays,
  setStayDays,
  onNavigateToCheckBill,
}: {
  term: string;
  setTerm: (v: string) => void;
  result: any;
  cityTier?: "X" | "Y" | "Z";
  setCityTier?: (t: "X" | "Y" | "Z") => void;
  nabhAccredited?: boolean;
  setNabhAccredited?: (n: boolean) => void;
  wardType?: "general" | "semi_private" | "private";
  setWardType?: (w: "general" | "semi_private" | "private") => void;
  stayDays?: number;
  setStayDays?: (d: number) => void;
  onNavigateToCheckBill?: () => void;
}) {
  const [activeCategory, setActiveCategory] = useState<string>("All");

  // Dynamically derive all specialty categories from the procedure master
  const categories = useMemo(() => {
    const cats = Array.from(new Set(COMMON_PROCEDURES.map((p) => p.cat)));
    return ["All", ...cats];
  }, []);

  const filteredProcedures = useMemo(() => {
    return activeCategory === "All"
      ? COMMON_PROCEDURES
      : COMMON_PROCEDURES.filter((p) => p.cat === activeCategory);
  }, [activeCategory]);

  const handleCategoryChange = (newCat: string) => {
    setActiveCategory(newCat);
    const filtered = newCat === "All"
      ? COMMON_PROCEDURES
      : COMMON_PROCEDURES.filter((p) => p.cat === newCat);
    if (filtered.length > 0 && !filtered.some((p) => p.id === term)) {
      setTerm(filtered[0].id);
    }
  };

  // Resilient benchmark metadata: merges server result with built-in instant reference master
  const benchmarkMeta = PROCEDURE_BENCHMARKS[term] || PROCEDURE_BENCHMARKS["TERM_PKG_LAP_CHOLE"];
  const currentDays = stayDays && stayDays > 0 ? stayDays : benchmarkMeta.recommendedDays;

  // Real-time calculation rules
  const tier = cityTier || "X";
  const tierMultiplier = tier === "Y" ? 0.90 : (tier === "Z" ? 0.80 : 1.0);
  const nabhFlag = nabhAccredited !== false;
  const nabhMultiplier = nabhFlag ? 1.0 : 0.85;
  const ward = wardType || "semi_private";
  const wardMultiplier = ward === "general" ? 0.95 : (ward === "private" ? 1.05 : 1.0);

  const calculatedBaseRate = Math.round(benchmarkMeta.baseRate * tierMultiplier * nabhMultiplier * wardMultiplier);
  const roomDailyRate = ward === "general" ? 1500 : (ward === "private" ? 4500 : 3000);
  const calculatedRoomComponent = benchmarkMeta.category === "package"
    ? 0
    : Math.round(roomDailyRate * currentDays * tierMultiplier);
  const consultDailyRate = 350;
  const calculatedConsultComponent = benchmarkMeta.category === "package"
    ? 0
    : Math.round(consultDailyRate * currentDays * tierMultiplier);

  const calculatedGovtTotal = calculatedBaseRate + calculatedRoomComponent + calculatedConsultComponent;
  const calculatedPrivateMin = Math.round(calculatedGovtTotal * 1.35);
  const calculatedPrivateMax = Math.round(calculatedGovtTotal * 2.25);

  // Active displayed values prioritize backend response if valid, falling back seamlessly to deterministic master
  const activeName = result?.name || benchmarkMeta.name;
  const activeNameHi = result?.name_hi || benchmarkMeta.name_hi;
  const activeScheme = result?.primary_scheme || benchmarkMeta.scheme;
  const activeCode = result?.primary_code || benchmarkMeta.code;
  const activeIcd10 = result?.icd10_code || benchmarkMeta.icd10;
  const activeGovtTotal = typeof result?.estimated_govt_benchmark_total === "number"
    ? result.estimated_govt_benchmark_total
    : calculatedGovtTotal;
  const activePrivateMin = result?.typical_private_estimate_range?.min ?? calculatedPrivateMin;
  const activePrivateMax = result?.typical_private_estimate_range?.max ?? calculatedPrivateMax;
  const activeInclusions = (result?.inclusions && result.inclusions.length > 0)
    ? result.inclusions
    : benchmarkMeta.inclusions;
  const activeExclusions = (result?.exclusions && result.exclusions.length > 0)
    ? result.exclusions
    : benchmarkMeta.exclusions;

  return (
    <div data-testid="estimator-tab" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-card rounded-2xl border border-line p-6 shadow-paper flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-brand-soft text-xs font-bold uppercase tracking-wider text-saffron-ink">
            <Calculator className="w-3.5 h-3.5" />
            <span>Pre-Admission Episode-of-Care Cost Benchmark</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl">What should this surgery or treatment cost?</h1>
          <p className="text-sm text-muted max-w-2xl">
            Check the government standard package rate (CGHS / PM-JAY / NPPA), see what must be included, and compare with typical private hospital billing quotes before you get admitted.
          </p>
        </div>
        {onNavigateToCheckBill && (
          <Button variant="primary" onClick={onNavigateToCheckBill} className="min-h-[48px] px-5">
            <FileCheck2 className="w-4 h-4 text-saffron" />
            <span>Already have a bill? Audit it now →</span>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Selector & Live Costing Results */}
        <section className="lg:col-span-7 space-y-5">
          {/* Procedure Selection & Category Filter */}
          <div className="bg-card rounded-2xl border border-line p-6 shadow-paper space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">
                1. Filter by medical specialty:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleCategoryChange(c)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      activeCategory === c
                        ? "bg-brand text-[rgb(var(--on-brand))] shadow-sm"
                        : "bg-paper border border-line text-muted hover:text-ink hover:border-saffron"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="estimator-select" className="block text-sm font-semibold mb-1.5">
                2. Pick the procedure, surgery or implant:
              </label>
              <select
                id="estimator-select"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                data-testid="estimator-select"
                className="w-full min-h-[48px] rounded-xl border border-line bg-paper px-3.5 text-sm font-semibold text-ink"
              >
                {filteredProcedures.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.cat}] {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Hospital & Stay Context Controls */}
            {setCityTier && setWardType && setNabhAccredited && (
              <div className="pt-3 border-t border-line grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted mb-1">City Tier</label>
                  <select
                    value={tier}
                    onChange={(e) => setCityTier(e.target.value as "X" | "Y" | "Z")}
                    className="w-full min-h-[40px] rounded-lg border border-line bg-paper px-2 text-xs font-semibold"
                  >
                    <option value="X">Tier X (Metros)</option>
                    <option value="Y">Tier Y (Cities)</option>
                    <option value="Z">Tier Z (Towns)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted mb-1">Ward Entitlement</label>
                  <select
                    value={ward}
                    onChange={(e) => setWardType(e.target.value as "general" | "semi_private" | "private")}
                    className="w-full min-h-[40px] rounded-lg border border-line bg-paper px-2 text-xs font-semibold"
                  >
                    <option value="general">General (-5%)</option>
                    <option value="semi_private">Semi-Private (Base)</option>
                    <option value="private">Private (+5%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted mb-1">Hospital Quality</label>
                  <select
                    value={nabhFlag ? "nabh" : "non_nabh"}
                    onChange={(e) => setNabhAccredited(e.target.value === "nabh")}
                    className="w-full min-h-[40px] rounded-lg border border-line bg-paper px-2 text-xs font-semibold"
                  >
                    <option value="nabh">NABH Accredited</option>
                    <option value="non_nabh">Non-NABH (-15%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted mb-1">Stay Duration</label>
                  <select
                    value={currentDays}
                    onChange={(e) => setStayDays && setStayDays(parseInt(e.target.value, 10))}
                    className="w-full min-h-[40px] rounded-lg border border-line bg-paper px-2 text-xs font-semibold"
                  >
                    <option value="1">1 Day (Daycare / Minor)</option>
                    <option value="2">2 Days (Standard)</option>
                    <option value="3">3 Days (Surgical)</option>
                    <option value="5">5 Days (Joint / Ortho)</option>
                    <option value="8">8 Days (Major / Cardiac)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Result Card: Inclusions, Exclusions & Episode Breakdown (ALWAYS VISIBLE) */}
          <div data-testid="estimator-result-card" className="bg-card rounded-2xl border border-line p-6 shadow-paper space-y-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-saffron-ink">
                  Official Reference: {activeScheme} {activeCode ? `(${activeCode})` : ""}
                </span>
                <h2 className="font-display text-xl font-bold mt-0.5">{activeName}</h2>
                {activeNameHi && <p className="text-xs text-muted font-hindi">{activeNameHi}</p>}
              </div>
              {activeIcd10 && (
                <span className="px-2.5 py-1 rounded-lg bg-paper border border-line font-mono text-xs font-bold">
                  ICD-10: {activeIcd10}
                </span>
              )}
            </div>

            {/* Price Comparison Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-4 rounded-xl bg-ok-soft/70 border border-ok/30 space-y-1">
                <div className="text-xs font-bold uppercase tracking-wider text-ok">
                  Government Package Benchmark
                </div>
                <div className="font-display text-3xl text-ok tnum font-bold">
                  {inr(activeGovtTotal)}
                </div>
                <p className="text-xs text-muted">
                  Tier-{tier} · {nabhFlag ? "NABH Accredited" : "Non-NABH"} · {ward.replace("_", " ")} ward · {currentDays} days
                </p>
              </div>

              <div className="p-4 rounded-xl bg-paper border border-line space-y-1">
                <div className="text-xs font-bold uppercase tracking-wider text-muted">
                  Typical Private Hospital Quote Range
                </div>
                <div className="font-display text-2xl sm:text-3xl tnum text-ink font-bold">
                  {inr(activePrivateMin)} – {inr(activePrivateMax)}
                </div>
                <p className="text-xs text-muted">Estimated fair private billing range</p>
              </div>
            </div>

            {/* Episode of Care Component Breakdown Table */}
            <div className="p-4 rounded-xl bg-paper border border-line space-y-2.5">
              <div className="text-xs font-bold uppercase tracking-wider text-ink flex items-center justify-between">
                <span>Episode-of-Care Cost Components:</span>
                <span className="text-muted font-normal text-[11px]">Grounded in official CGHS/PM-JAY gazette</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-1 border-b border-line/60">
                  <span className="text-muted">Primary Surgery / Procedure / Implant:</span>
                  <span className="font-bold text-ink tnum">{inr(calculatedBaseRate)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-line/60">
                  <span className="text-muted">Hospital Bed &amp; Routine Nursing ({currentDays} days in {ward.replace("_", " ")}):</span>
                  <span className="font-bold text-ink tnum">
                    {calculatedRoomComponent > 0 ? inr(calculatedRoomComponent) : "₹0 (Included in Package)"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-line/60">
                  <span className="text-muted">Daily Specialist Rounds ({currentDays} days):</span>
                  <span className="font-bold text-ink tnum">
                    {calculatedConsultComponent > 0 ? inr(calculatedConsultComponent) : "₹0 (Included in Package)"}
                  </span>
                </div>
                <div className="flex justify-between pt-1.5 text-sm font-bold">
                  <span className="text-ink">Total Official Benchmark Package:</span>
                  <span className="text-ok font-display tnum">{inr(activeGovtTotal)}</span>
                </div>
              </div>
            </div>

            {/* What is Included (Protects from Unbundling) */}
            {activeInclusions && activeInclusions.length > 0 && (
              <div className="p-4 rounded-xl bg-paper border border-line space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-ok flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-ok" />
                  <span>What the hospital cannot bill twice (Mandatory Inclusions):</span>
                </div>
                <ul className="text-xs text-ink space-y-1.5 list-disc list-inside">
                  {activeInclusions.map((inc: string, i: number) => (
                    <li key={i} className="leading-relaxed">
                      {inc}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Expected Extra Charges (Exclusions) */}
            {activeExclusions && activeExclusions.length > 0 && (
              <div className="p-4 rounded-xl bg-paper border border-line space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-warn" />
                  <span>Allowed Extras (May be billed separately if clinically needed):</span>
                </div>
                <ul className="text-xs text-muted space-y-1 list-disc list-inside">
                  {activeExclusions.map((exc: string, i: number) => (
                    <li key={i} className="leading-relaxed">
                      {exc}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-xs text-muted pt-2 border-t border-line leading-relaxed">
              Informational tool, not legal or medical advice. Private hospitals set independent rates for cash patients (except statutory NPPA implant/drug caps under DPCO 2013). Use this estimate to request a binding written estimate before admission.
            </p>
          </div>
        </section>

        {/* Right Column: Pre-Admission Checklist & Financial Rights */}
        <section className="lg:col-span-5 space-y-5">
          {/* Pre-Admission Patient Rights Checklist */}
          <div className="bg-card rounded-2xl border border-line p-6 shadow-paper space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-saffron-ink" />
              <h2 className="font-display text-lg font-bold">Pre-Admission Patient Checklist</h2>
            </div>
            <p className="text-xs text-muted">
              Use these statutory rights before signing admission papers at any private hospital in India:
            </p>
            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-paper border border-line space-y-1">
                <strong className="text-ink">1. Demand a Written Cost Estimate:</strong>
                <p className="text-muted leading-relaxed">
                  Under the Clinical Establishments Rules and Consumer Protection Act 2019, hospitals must provide an itemized written estimate detailing bed charges, OT, surgeon fee, and consumables before admission.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-paper border border-line space-y-1">
                <strong className="text-ink">2. Verify NPPA Stent / Knee Price Caps:</strong>
                <p className="text-muted leading-relaxed">
                  If receiving a cardiac drug-eluting stent (statutory cap: ₹38,265) or knee implant system (cap: ₹62,770), verify the manufacturer invoice and batch number on your bill. Private hospitals cannot exceed NPPA caps.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-paper border border-line space-y-1">
                <strong className="text-ink">3. Clarify Package vs Itemized Billing:</strong>
                <p className="text-muted leading-relaxed">
                  If paying for a surgery package, routine nursing care, RMO monitoring, and OT disposables cannot be charged again as separate line items.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-paper border border-line space-y-1">
                <strong className="text-ink">4. Check City Tier &amp; Ward Entitlement:</strong>
                <p className="text-muted leading-relaxed">
                  Government benchmarks vary by Tier-X (Metro), Tier-Y, and Tier-Z cities, with 5% adjustments between General and Semi-Private wards. Use this benchmark to negotiate fair room tariffs.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ 3. Policy analytics (k >= 10) */

export function AnalyticsPage({ data }: { data: any }) {
  if (!data) {
    return (
      <section className="space-y-4">
        <div className="text-xs text-muted">Loading k-Anonymity regulator analytics...</div>
        <div className="skeleton h-20" />
        <div className="skeleton h-72" />
      </section>
    );
  }
  return (
    <section data-testid="regulator-analytics-tab" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-saffron-ink">Public-interest view</p>
          <h1 className="font-display text-2xl sm:text-3xl mt-0.5">Where hospital bills drift furthest from government rates</h1>
          <p className="text-sm text-muted mt-1 max-w-2xl">
            Protected by strict k-Anonymity (k ≥ {data.k_anonymity_threshold}): only categories with at least {data.k_anonymity_threshold} anonymous bills are shown, so no single patient or bill can ever be identified.
          </p>
        </div>
        <span className="px-3.5 py-1.5 rounded-full bg-ok-soft text-ok text-xs font-bold">
          {data.total_anonymized_bills_analyzed} anonymous bills · zero personal data
        </span>
      </div>

      <div className="bg-card rounded-2xl border border-line p-6 shadow-paper space-y-4">
        <h2 className="font-display text-lg">Average billed amount vs government benchmark</h2>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.category_benchmarks}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--line))" />
              <XAxis dataKey="category" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <RechartsTooltip />
              <Legend />
              <Bar dataKey="avg_billed_inr" name="Avg hospital bill (₹)" fill="#B3261E" radius={[6, 6, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="avg_reference_inr" name="Govt reference rate (₹)" fill="#1D6B45" radius={[6, 6, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-line p-6 shadow-paper space-y-4">
        <div>
          <h2 className="font-display text-lg">Hospital billing clarity scores</h2>
          <p className="text-xs text-muted">Higher scores mean fewer unbundled items and closer alignment with published schedules.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.hospital_transparency_leaderboard.map((h: any) => (
            <div key={h.hospital_id} className="p-4 rounded-xl border border-line bg-paper flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold">{h.name}</div>
                <div className="text-xs text-muted">
                  {h.city} ({h.state}) · Tier {h.tier} · {h.nabh_accredited ? "NABH" : "Non-NABH"}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-display text-2xl text-ok tnum">{h.transparency_score}/100</div>
                <div className="text-[11px] text-muted">Clarity score</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ 4. My reports (history) */

export function HistoryPage({
  list,
  onOpenHash,
}: {
  list: any[];
  onOpenHash: (hash: string) => void;
}) {
  return (
    <section data-testid="history-tab" className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-saffron-ink">Saved in this browser session</p>
        <h1 className="font-display text-2xl sm:text-3xl mt-0.5">Bills you've checked</h1>
      </div>

      {list.length === 0 ? (
        <div className="bg-card rounded-2xl border border-line p-10 text-center space-y-2">
          <FileText className="w-8 h-8 text-muted mx-auto" />
          <div className="font-semibold">No reports saved right now</div>
          <p className="text-sm text-muted max-w-md mx-auto">
            When you check a bill, it shows up here so you can download the PDF again or verify its code. You can wipe this list anytime from Privacy.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((item) => (
            <div
              key={item.report_hash}
              className="bg-card rounded-2xl border border-line p-5 shadow-paper flex flex-wrap items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="font-semibold text-base">{item.hospital_name}</div>
                <div className="text-xs text-muted flex flex-wrap items-center gap-2">
                  <span>{item.created_at}</span>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() => onOpenHash(item.report_hash)}
                    className="font-mono underline text-saffron-ink"
                  >
                    #{item.report_hash.slice(0, 12)}…
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right text-sm">
                  <div className="tnum">Billed {inr(item.billed_total)}</div>
                  <div className="text-xs font-semibold text-saffron-ink tnum">
                    {item.flagged_count} flagged · {inr(item.potential_savings)} difference
                  </div>
                </div>
                <a
                  href={`/api/report/${item.report_hash}/pdf`}
                  className={buttonClass("accent", "text-sm")}
                >
                  <Download className="w-4 h-4" /> PDF
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ 5. Is a report genuine? (/verify/:hash) */

export function VerifyHashPage({
  hash,
  setHash,
  result,
  onVerify,
}: {
  hash: string;
  setHash: (h: string) => void;
  result: any;
  onVerify: () => void;
}) {
  return (
    <section data-testid="verify-hash-tab" className="max-w-2xl space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-saffron-ink">Public verification · /verify/:hash</p>
        <h1 className="font-display text-2xl sm:text-3xl mt-0.5">Check if a printed report is genuine</h1>
        <p className="text-sm text-muted mt-1">
          Every PDF we create carries a QR code and a 64-character fingerprint. Paste that code here to confirm not a single number was edited after the report was made.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onVerify();
        }}
        className="flex flex-col sm:flex-row gap-2"
      >
        <input
          type="text"
          value={hash}
          onChange={(e) => setHash(e.target.value)}
          placeholder="Paste the 64-character report code…"
          data-testid="hash-lookup-input"
          className="flex-1 min-h-[48px] rounded-xl border border-line bg-card px-3.5 font-mono text-xs"
        />
        <Button type="submit" variant="primary" data-testid="verify-hash-submit-btn">
          <QrCode className="w-4 h-4" /> Check report
        </Button>
      </form>

      {result && (
        <div
          data-testid="hash-verification-result"
          className={`p-5 rounded-2xl border space-y-3 ${
            result.valid ? "bg-ok-soft/70 border-ok/35" : "bg-flag-soft/70 border-flag/35"
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-base">
            <CheckCircle2 className="w-5 h-5 text-ok shrink-0" />
            <span>
              {result.valid
                ? "CRYPTOGRAPHIC PROOF VALID — This report matches our ledger word for word."
                : "We couldn't find this code, or the report was changed after creation."}
            </span>
          </div>
          {result.valid && (
            <dl className="text-xs space-y-1.5 pt-2 border-t border-line font-mono">
              <div>
                <span className="font-sans text-muted">Hospital: </span>
                <strong className="font-sans">{result.hospital_name}</strong>
              </div>
              <div className="break-all">
                <span className="font-sans text-muted">Report hash: </span>
                {result.report_hash}
              </div>
              <div className="break-all">
                <span className="font-sans text-muted">Recomputed SHA-256: </span>
                {result.recomputed_hash}
              </div>
              <div className="break-all">
                <span className="font-sans text-muted">Previous link in chain: </span>
                {result.prev_hash}
              </div>
              <div className="break-all">
                <span className="font-sans text-muted">Merkle batch root ({result.anchor_network}): </span>
                {result.merkle_root}
              </div>
            </dl>
          )}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ 6. Privacy & my data (DPDP Act 2023) */

export function PrivacyPage({
  retentionDays,
  setRetentionDays,
  onDelete,
  statusMsg,
  t,
}: {
  retentionDays: number;
  setRetentionDays: (n: number) => void;
  onDelete: () => void;
  statusMsg: string;
  t: UITranslations;
}) {
  return (
    <section data-testid="privacy-tab" className="max-w-2xl space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-saffron-ink">Digital Personal Data Protection Act 2023</p>
        <h1 className="font-display text-2xl sm:text-3xl mt-0.5">Your bill, your data</h1>
        <p className="text-sm text-muted mt-1">
          Medical bills are personal. Here is what we do to keep yours private, and how to wipe everything we hold.
        </p>
      </div>

      <div className="bg-card rounded-2xl border border-line p-6 shadow-paper space-y-4 text-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-paper border border-line">
            <div className="font-semibold">Names & IDs are stripped first</div>
            <p className="text-xs text-muted mt-1">
              Patient name, phone number, 12-digit Aadhaar, UHID and email are masked before anything touches the database.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-paper border border-line">
            <div className="font-semibold">Never sold, never shared raw</div>
            <p className="text-xs text-muted mt-1">
              Policy charts only ever show totals across 10 or more bills. Nobody can trace a number back to you.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-line">
          <div>
            <label htmlFor="retention-select" className="font-semibold block">
              Auto-delete my uploaded bill after
            </label>
            <span className="text-xs text-muted">Shorter is safer; longer lets you re-download your PDF next week.</span>
          </div>
          <select
            id="retention-select"
            value={retentionDays}
            onChange={(e) => setRetentionDays(Number(e.target.value))}
            className="min-h-[44px] rounded-xl border border-line bg-paper px-3 font-semibold"
          >
            <option value={1}>1 day</option>
            <option value={7}>7 days (default)</option>
            <option value={30}>30 days</option>
          </select>
        </div>

        <div className="pt-4 border-t border-line flex flex-wrap items-center gap-4">
          <Button variant="danger" onClick={onDelete} data-testid="delete-my-data-btn">
            <Trash2 className="w-4 h-4" /> {t.deleteMyData}
          </Button>
          {statusMsg && (
            <span data-testid="privacy-deleted-confirmation" className="text-sm font-semibold text-ok">
              {statusMsg}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ 7. Design system & component storybook */

export function StorybookPage() {
  const swatches = [
    { name: "Warm Paper", hex: "#FAF7F2", note: "Page background" },
    { name: "Deep Indigo", hex: "#2B1166", note: "Primary ink & actions" },
    { name: "Marigold Saffron", hex: "#F58220", note: "Single accent" },
    { name: "Forest Green", hex: "#1D6B45", note: "Matches government rate" },
    { name: "Crimson Stamp", hex: "#B3261E", note: "Above reference rate" },
    { name: "Amber Review", hex: "#8A5A00", note: "Please confirm OCR" },
  ];
  return (
    <section data-testid="storybook-tab" className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-saffron-ink">Civic Receipt Design System</p>
        <h1 className="font-display text-2xl sm:text-3xl mt-0.5">Tokens, type & components</h1>
        <p className="text-sm text-muted mt-1">
          Built around a warm paper receipt, Fraunces editorial headings, Figtree body copy, and WCAG AA contrast in both light and dark modes.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {swatches.map((s) => (
          <div key={s.name} className="bg-card p-3.5 rounded-2xl border border-line shadow-paper">
            <div className="h-14 rounded-xl border border-line mb-2.5" style={{ backgroundColor: s.hex }} />
            <div className="font-semibold text-sm">{s.name}</div>
            <div className="font-mono text-xs text-muted">{s.hex}</div>
            <div className="text-xs text-muted mt-0.5">{s.note}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card p-5 rounded-2xl border border-line space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-muted">Verdict stamps</div>
          <div className="flex flex-wrap gap-3 pt-1">
            <span className="stamp text-flag text-xs">1 item above approved rate</span>
            <span className="stamp text-ok text-xs">Within government rates</span>
          </div>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-line space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-muted">Read-accuracy rings</div>
          <div className="flex items-center gap-5 pt-1">
            <ConfidenceRing confidence={0.98} />
            <ConfidenceRing confidence={0.78} />
            <ConfidenceRing confidence={0.61} />
          </div>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-line space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-muted">design-tokens.json</div>
          <pre className="text-[11px] font-mono bg-paper p-3 rounded-xl overflow-x-auto max-h-28">
            {JSON.stringify(designTokens.color.brand, null, 2)}
          </pre>
        </div>
      </div>
    </section>
  );
}

