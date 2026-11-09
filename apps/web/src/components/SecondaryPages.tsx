import React, { useState } from "react";
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

const COMMON_PROCEDURES = [
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
  const categories = ["All", "General Surgery", "Cardiology", "Neurosurgery", "Orthopaedics", "Obstetrics", "Medical Devices"];

  const filteredProcedures = activeCategory === "All"
    ? COMMON_PROCEDURES
    : COMMON_PROCEDURES.filter((p) => p.cat === activeCategory);

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
        {/* Left Column: Interactive Selector & Clinical Inclusions */}
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
                    onClick={() => setActiveCategory(c)}
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
                className="w-full min-h-[48px] rounded-xl border border-line bg-paper px-3.5 text-sm font-semibold"
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
              <div className="pt-3 border-t border-line grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted mb-1">City Tier</label>
                  <select
                    value={cityTier || "X"}
                    onChange={(e) => setCityTier(e.target.value as "X" | "Y" | "Z")}
                    className="w-full min-h-[40px] rounded-lg border border-line bg-paper px-2.5 text-xs font-semibold"
                  >
                    <option value="X">Tier X (Delhi, Mumbai, BLR, Pune)</option>
                    <option value="Y">Tier Y (Jaipur, Lucknow, Ludhiana)</option>
                    <option value="Z">Tier Z (District Towns / Rural)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted mb-1">Ward Entitlement</label>
                  <select
                    value={wardType || "semi_private"}
                    onChange={(e) => setWardType(e.target.value as "general" | "semi_private" | "private")}
                    className="w-full min-h-[40px] rounded-lg border border-line bg-paper px-2.5 text-xs font-semibold"
                  >
                    <option value="general">General Ward (-5%)</option>
                    <option value="semi_private">Semi-Private (Standard Base)</option>
                    <option value="private">Private Ward (+5%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted mb-1">Hospital Quality</label>
                  <select
                    value={nabhAccredited ? "nabh" : "non_nabh"}
                    onChange={(e) => setNabhAccredited(e.target.value === "nabh")}
                    className="w-full min-h-[40px] rounded-lg border border-line bg-paper px-2.5 text-xs font-semibold"
                  >
                    <option value="nabh">NABH / NABL Accredited (100%)</option>
                    <option value="non_nabh">Non-NABH Hospital (-15%)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Result Card: Inclusions, Exclusions & Episode Breakdown */}
          {result?.found && (
            <div className="bg-card rounded-2xl border border-line p-6 shadow-paper space-y-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-3">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-saffron-ink">
                    Official Reference: {result.primary_scheme} {result.primary_code ? `(${result.primary_code})` : ""}
                  </span>
                  <h2 className="font-display text-xl font-bold mt-0.5">{result.name}</h2>
                  {result.name_hi && <p className="text-xs text-muted font-hindi">{result.name_hi}</p>}
                </div>
                {result.icd10_code && (
                  <span className="px-2.5 py-1 rounded-lg bg-paper border border-line font-mono text-xs font-bold">
                    ICD-10: {result.icd10_code}
                  </span>
                )}
              </div>

              {/* Price Comparison Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-4 rounded-xl bg-ok-soft/70 border border-ok/30 space-y-1">
                  <div className="text-xs font-bold uppercase tracking-wider text-ok">
                    Government Package Benchmark
                  </div>
                  <div className="font-display text-3xl text-ok tnum">
                    {inr(result.estimated_govt_benchmark_total)}
                  </div>
                  <p className="text-xs text-muted">
                    Tier-{result.city_tier} · {result.nabh_accredited ? "NABH" : "Non-NABH"} · {result.ward_type?.replace("_", " ")} ward
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-paper border border-line space-y-1">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted">
                    Typical Private Hospital Quote Range
                  </div>
                  <div className="font-display text-2xl sm:text-3xl tnum text-ink">
                    {result.typical_private_estimate_range
                      ? `${inr(result.typical_private_estimate_range.min)} – ${inr(result.typical_private_estimate_range.max)}`
                      : "Request written estimate"}
                  </div>
                  <p className="text-xs text-muted">Based on national private tariff surveys</p>
                </div>
              </div>

              {/* What is Included (Protects from Unbundling) */}
              {result.inclusions && result.inclusions.length > 0 && (
                <div className="p-4 rounded-xl bg-paper border border-line space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-ok flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-ok" />
                    <span>What the hospital cannot bill twice (Mandatory Inclusions):</span>
                  </div>
                  <ul className="text-xs text-ink space-y-1.5 list-disc list-inside">
                    {result.inclusions.map((inc: string, i: number) => (
                      <li key={i} className="leading-relaxed">
                        {inc}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Expected Extra Charges (Exclusions) */}
              {result.exclusions && result.exclusions.length > 0 && (
                <div className="p-4 rounded-xl bg-paper border border-line space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-warn" />
                    <span>Allowed Extras (May be billed separately if clinically needed):</span>
                  </div>
                  <ul className="text-xs text-muted space-y-1 list-disc list-inside">
                    {result.exclusions.map((exc: string, i: number) => (
                      <li key={i} className="leading-relaxed">
                        {exc}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-xs text-muted pt-2 border-t border-line leading-relaxed">
                {result.disclaimer}
              </p>
            </div>
          )}
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
                  If receiving a cardiac drug-eluting stent (statutory cap: ₹38,265) or knee implant system (cap: ₹60,845), verify the manufacturer invoice and batch number on your bill. Private hospitals cannot exceed NPPA caps.
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

