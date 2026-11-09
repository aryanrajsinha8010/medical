import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Calculator,
  Camera,
  CheckCircle2,
  ChevronRight,
  Database,
  Download,
  Eye,
  FileCheck2,
  FileText,
  Globe,
  History as HistoryIcon,
  MessageSquare,
  Moon,
  Plus,
  QrCode,
  Scale,
  Share2,
  ShieldCheck,
  Sun,
  Trash2,
  Upload,
  Volume2,
  WifiOff,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  AskChargeSheet,
  CameraModal,
  ConsentModal,
  DisputeLetterModal,
  EvidenceSheet,
  LowLiteracyBar,
} from "./components/Dialogs";
import {
  AnalyticsPage,
  EstimatorPage,
  HistoryPage,
  PrivacyPage,
  RatesPage,
  StorybookPage,
  VerifyHashPage,
} from "./components/SecondaryPages";
import {
  Button,
  ConfidenceRing,
  CountUp,
  InfoTip,
  Logo,
  SCHEME_MEANING,
  Segmented,
  Term,
  Toast,
  buttonClass,
  inr,
  useOnline,
  usePersistentState,
} from "./components/ui";
import { LANGUAGE_LABELS, SupportedLang, explanationLang, getTranslations } from "./i18n/translations";

type ActiveTab =
  | "home"
  | "verify"
  | "rates"
  | "estimator"
  | "analytics"
  | "history"
  | "hash_lookup"
  | "privacy"
  | "storybook";

interface EditableLine {
  line_id?: string;
  raw_text: string;
  qty: number;
  unit_price: number;
  total: number;
  confidence: number;
  bbox?: { x: number; y: number; w: number; h: number };
}

/** Friendly names for the demo bills so a first-time visitor isn't greeted by "BILL_001_DECK_SLIDE3". */
function friendlyBillTitle(bill: any, index: number): string {
  if (!bill) return "";
  if (bill.bill_id === "BILL_001_DECK_SLIDE3") {
    return "Sample 1 · Metro hospital stay (room charge above CGHS rate)";
  }
  const catMap: Record<string, string> = {
    clean_photo: "Clear printed bill",
    skewed: "Tilted phone photo",
    blurry: "Slightly blurry photo",
    hindi: "Hindi / bilingual bill",
    handwritten: "Handwritten slip",
    multipage: "Multi-page admission bill",
    package_bill: "Surgery package bill",
  };
  const tag = catMap[bill.category] || bill.category || "Sample bill";
  return `Sample ${index + 1} · ${tag} — ${bill.hospital_name || bill.title}`;
}

export default function App() {
  const [lang, setLang] = usePersistentState<SupportedLang>("sbc_lang", "en");
  const t = getTranslations(lang);
  const elang = explanationLang(lang);
  const online = useOnline();

  const [darkMode, setDarkMode] = usePersistentState<boolean>("sbc_dark", false);
  const [largeTextMode, setLargeTextMode] = usePersistentState<boolean>("sbc_large_text", false);
  const [lowLiteracyMode, setLowLiteracyMode] = usePersistentState<boolean>("sbc_simple", false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("home");
  const [toast, setToast] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSampleBill, setIsSampleBill] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    document.documentElement.classList.toggle("text-large", largeTextMode);
  }, [largeTextMode]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Bill context & verification state
  const [sessionId] = useState("citizen-session-2026");
  const [hospitalName, setHospitalName] = useState("");
  const [stateCode, setStateCode] = useState("DL");
  const [cityTier, setCityTier] = useState<"X" | "Y" | "Z">("X");
  const [nabhAccredited, setNabhAccredited] = useState(true);
  const [wardType, setWardType] = useState<"general" | "semi_private" | "private">("semi_private");
  const [stayDays, setStayDays] = useState(2);
  const [retentionDays, setRetentionDays] = useState(7);

  const [demoBills, setDemoBills] = useState<any[]>([]);
  const [selectedBillId, setSelectedBillId] = useState("");
  const [previewImageUrl, setPreviewImageUrl] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const [processingStage, setProcessingStage] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [uploadedBillMeta, setUploadedBillMeta] = useState<{
    filename: string;
    engine: string;
    lineCount: number;
    piiRedacted: number;
    hospital: string;
  } | null>(null);
  const [stepMode, setStepMode] = useState<"capture" | "review" | "report">("capture");
  const [lineFilter, setLineFilter] = useState<"all" | "flagged" | "ok">("all");

  const [editableLines, setEditableLines] = useState<EditableLine[]>([]);

  const [verificationData, setVerificationData] = useState<any>(null);
  const [showXray, setShowXray] = useState(false);
  const [evidenceDrawerLine, setEvidenceDrawerLine] = useState<any>(null);
  const [chatDrawerLine, setChatDrawerLine] = useState<any>(null);
  const [chatQuestion, setChatQuestion] = useState("");
  const [chatResponse, setChatResponse] = useState<any>(null);
  const [showDisputeModal, setShowDisputeModal] = useState(false);

  // Camera
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Secondary tab data
  const [ratesCatalog, setRatesCatalog] = useState<any[]>([]);
  const [rateSearch, setRateSearch] = useState("");
  const [rateSchemeFilter, setRateSchemeFilter] = useState("");
  const [estimatorTerm, setEstimatorTerm] = useState("TERM_PKG_LAP_CHOLE");
  const [estimatorResult, setEstimatorResult] = useState<any>(null);
  const [insurerClaimResult, setInsurerClaimResult] = useState<any>(null);
  const [regulatorData, setRegulatorData] = useState<any>(null);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [lookupHash, setLookupHash] = useState("");
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [privacyStatusMsg, setPrivacyStatusMsg] = useState("");

  // Check URL path for `/verify/:hash` or `/storybook`
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith("/verify/")) {
      const h = path.replace("/verify/", "").trim();
      if (h) {
        setLookupHash(h);
        setActiveTab("hash_lookup");
        fetch(`/api/verify/${encodeURIComponent(h)}`)
          .then((r) => r.json())
          .then((d) => setLookupResult(d))
          .catch(() => {});
      }
    } else if (path.startsWith("/storybook")) {
      setActiveTab("storybook");
    }
  }, []);

  // Load Demo Bills catalog without auto-running verification
  useEffect(() => {
    fetch("/api/demo-bills")
      .then((r) => r.json())
      .then((d) => setDemoBills(d.bills || []))
      .catch(() => {});
  }, []);

  async function runVerificationRequest(
    linesToVerify: EditableLine[],
    hosp = hospitalName,
    st = stateCode,
    tier = cityTier,
    nabh = nabhAccredited,
    ward = wardType,
    days = stayDays,
    keepReviewOpen = false,
    rawOcrText?: string,
    billedGrandTotal?: number | null
  ) {
    setIsScanning(true);
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          hospital_name: hosp,
          state: st,
          city_tier: tier,
          nabh_accredited: nabh,
          ward_type: ward,
          stay_days: days,
          retention_days: retentionDays,
          billed_grand_total: billedGrandTotal ?? null,
          raw_ocr_text:
            rawOcrText || `${hosp}\nPatient Name: Rajesh Sharma | Phone: 9811223344 | UHID: IMSH-0891`,
          lines: linesToVerify,
        }),
      });
      const data = await res.json();
      setVerificationData(data);
      if (!keepReviewOpen) {
        setStepMode("report");
      }
    } catch (e) {
      console.error(e);
      setToast(t.errorTitle);
    } finally {
      setTimeout(() => {
        setIsScanning(false);
        setProcessingStage(0);
      }, 320);
    }
  }

  function handleSelectDemoBill(billSpec: any) {
    setIsSampleBill(true);
    setUploadedBillMeta(null);
    setSelectedBillId(billSpec.bill_id);
    setHospitalName(billSpec.hospital_name);
    setStateCode(billSpec.state);
    setCityTier(billSpec.city_tier);
    setNabhAccredited(billSpec.nabh_accredited);
    setWardType(billSpec.ward_type);
    setStayDays(billSpec.stay_days);
    setPreviewImageUrl(`/api/demo-bills/${billSpec.bill_id}/image`);

    const mappedLines: EditableLine[] = billSpec.lines.map((l: any, idx: number) => ({
      raw_text: l.raw_text,
      qty: l.qty,
      unit_price: l.unit_price,
      total: l.total,
      confidence: billSpec.category === "handwritten" ? 0.76 : 0.96,
      bbox: { x: 0.04, y: 0.235 + idx * 0.038, w: 0.92, h: 0.036 },
    }));
    setEditableLines(mappedLines);
    runVerificationRequest(
      mappedLines,
      billSpec.hospital_name,
      billSpec.state,
      billSpec.city_tier,
      billSpec.nabh_accredited,
      billSpec.ward_type,
      billSpec.stay_days
    );
  }

  async function processUploadedFile(file: File) {
    setIsSampleBill(false);
    setIsScanning(true);
    setProcessingStage(1);
    if (file.type.startsWith("image/")) {
      setPreviewImageUrl(URL.createObjectURL(file));
    }
    const timer2 = setTimeout(() => setProcessingStage(2), 380);
    const timer3 = setTimeout(() => setProcessingStage(3), 820);

    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/ocr", { method: "POST", body: form });
      const data = await res.json();
      clearTimeout(timer2);
      clearTimeout(timer3);
      setProcessingStage(4);

      if (data.preprocessed_image_b64 && !file.type.startsWith("image/")) {
        setPreviewImageUrl(`data:image/png;base64,${data.preprocessed_image_b64}`);
      }

      if (data.lines && data.lines.length > 0) {
        const nextHosp = data.hospital_name || hospitalName;
        const nextState = data.state || stateCode;
        const nextTier = (data.city_tier as "X" | "Y" | "Z") || cityTier;
        const nextNabh = typeof data.nabh_accredited === "boolean" ? data.nabh_accredited : nabhAccredited;
        const nextWard = (data.ward_type as "general" | "semi_private" | "private") || wardType;
        const nextDays = data.stay_days || stayDays;

        setHospitalName(nextHosp);
        setStateCode(nextState);
        setCityTier(nextTier);
        setNabhAccredited(nextNabh);
        setWardType(nextWard);
        setStayDays(nextDays);
        setEditableLines(data.lines);
        setStepMode("review");

        const piiTotal = data.pii_redaction?.counts
          ? Object.values<number>(data.pii_redaction.counts).reduce((a, b) => a + b, 0)
          : 0;
        setUploadedBillMeta({
          filename: file.name,
          engine: data.ocr_engine || "OpenCV+RapidOCR",
          lineCount: data.lines.length,
          piiRedacted: piiTotal,
          hospital: nextHosp,
        });

        await runVerificationRequest(
          data.lines,
          nextHosp,
          nextState,
          nextTier,
          nextNabh,
          nextWard,
          nextDays,
          true,
          data.redacted_text,
          data.billed_grand_total
        );
        setToast(`Read ${data.lines.length} items from ${nextHosp} and checked official rates.`);
      } else {
        setToast("Could not find billable rows in that file — you can type or adjust rows below.");
        setStepMode("review");
        setIsScanning(false);
        setProcessingStage(0);
      }
    } catch (err) {
      clearTimeout(timer2);
      clearTimeout(timer3);
      console.error(err);
      setToast(t.errorTitle);
      setIsScanning(false);
      setProcessingStage(0);
    }
  }

  async function handleQuickRealBill(url: string, filename: string) {
    try {
      setIsScanning(true);
      setProcessingStage(1);
      const resp = await fetch(url);
      const blob = await resp.blob();
      const file = new File([blob], filename, { type: blob.type || "image/png" });
      await processUploadedFile(file);
    } catch (e) {
      console.error(e);
      setIsScanning(false);
      setProcessingStage(0);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) await processUploadedFile(file);
    e.target.value = "";
  }

  async function startCameraCapture() {
    setCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      /* Desktop/CI without webcam falls back gracefully */
    }
  }

  function stopCameraAndUseFrame() {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((tr) => tr.stop());
    }
    setCameraActive(false);
    setStepMode("review");
  }

  function speakReportSummary() {
    if (!("speechSynthesis" in window) || !verificationData) return;
    window.speechSynthesis.cancel();
    const sum = verificationData.verification.summary;
    const text =
      lang === "hi"
        ? `स्वास्थ्य बिल चेक रिपोर्ट: कुल बिल ${sum.billed_total} रुपये है। सरकारी संदर्भ दर ${sum.reference_total} रुपये है। ${sum.flagged_count} मद सरकारी दर से ज़्यादा हैं। पूछने लायक अंतर ${sum.potential_savings} रुपये है।`
        : `SwasthyaBillCheck report: You were billed ${sum.billed_total} rupees. The government reference rate is ${sum.reference_total} rupees. ${sum.flagged_count} item is higher than the reference rate, a difference of ${sum.potential_savings} rupees.`;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang === "hi" ? "hi-IN" : "en-IN";
    window.speechSynthesis.speak(utter);
  }

  function shareOnWhatsApp() {
    if (!verificationData) return;
    const sum = verificationData.verification.summary;
    const hash = verificationData.ledger.report_hash;
    const msg = `SwasthyaBillCheck bill report\nHospital: ${hospitalName}\nBilled: ₹${sum.billed_total.toLocaleString("en-IN")} · Govt rate: ₹${sum.reference_total.toLocaleString("en-IN")}\n${sum.flagged_count} item(s) above reference rate (₹${sum.potential_savings.toLocaleString("en-IN")} difference)\nVerify report: ${window.location.origin}/verify/${hash}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  }

  async function askGroundedQuestion(line: any, presetQ?: string) {
    const q = presetQ || chatQuestion || "Why is this charge flagged and what is the official government rate?";
    setChatResponse(null);
    const res = await fetch("/api/ask-charge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ line_verification: line, question: q, lang }),
    });
    const data = await res.json();
    setChatResponse(data);
  }

  function copyText(text: string) {
    navigator.clipboard?.writeText(text);
    setToast("Copied to clipboard");
  }

  // Load secondary tab datasets
  useEffect(() => {
    if (activeTab === "rates") {
      const qs = new URLSearchParams();
      if (rateSchemeFilter) qs.set("scheme", rateSchemeFilter);
      if (rateSearch) qs.set("q", rateSearch);
      fetch(`/api/rates?${qs.toString()}`)
        .then((r) => r.json())
        .then((d) => setRatesCatalog(d.rates || []));
    } else if (activeTab === "estimator") {
      fetch("/api/estimator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          canonical_id: estimatorTerm,
          city_tier: cityTier,
          nabh_accredited: nabhAccredited,
          ward_type: wardType,
          stay_days: stayDays,
        }),
      })
        .then((r) => r.json())
        .then((d) => setEstimatorResult(d));
    } else if (activeTab === "analytics") {
      fetch("/api/analytics/regulator")
        .then((r) => r.json())
        .then((d) => setRegulatorData(d));
    } else if (activeTab === "history") {
      fetch(`/api/history?session_id=${encodeURIComponent(sessionId)}`)
        .then((r) => r.json())
        .then((d) => setHistoryList(d.history || []));
    }
  }, [activeTab, rateSchemeFilter, rateSearch, estimatorTerm, cityTier, nabhAccredited, wardType, stayDays]);

  const vSummary = verificationData?.verification?.summary;
  const vLines: any[] = verificationData?.verification?.lines || [];
  const vAnomalies: any[] = verificationData?.verification?.bill_level_anomalies || [];
  const vLedger = verificationData?.ledger;

  const navItems = [
    { id: "home", label: "Home & Guide", icon: BookOpen },
    { id: "verify", label: t.navCheck, icon: FileCheck2 },
    { id: "rates", label: t.navRates, icon: Database },
    { id: "estimator", label: t.navEstimator, icon: Calculator },
    { id: "analytics", label: t.navAnalytics, icon: BarChart3 },
    { id: "history", label: t.navHistory, icon: HistoryIcon },
    { id: "hash_lookup", label: t.navVerifyHash, icon: QrCode },
    { id: "privacy", label: t.navPrivacy, icon: ShieldCheck },
  ] as const;

  return (
    <div className="min-h-screen bg-paper text-ink grain flex flex-col">
      {/* 1. HONEST LEGAL & DATA PROVENANCE STRIP (Calm, clear, non-scary) */}
      <div className="bg-brand text-[rgb(var(--on-brand))] text-xs border-b border-line/20">
        <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Scale className="w-3.5 h-3.5 text-saffron shrink-0" />
            <span data-testid="legal-disclaimer-banner" className="font-medium">
              {t.disclaimerBanner} <span className="opacity-85 hidden md:inline">{t.disclaimerMore}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              data-testid="sample-seed-badge"
              title={t.sampleDataTip}
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-saffron/20 text-saffron border border-saffron/40"
            >
              <Database className="w-3 h-3" /> {t.sampleDataBadge}
            </span>
            <button
              type="button"
              onClick={() => setShowConsentModal(true)}
              className="underline opacity-90 hover:opacity-100 text-xs px-1.5 py-0.5"
            >
              How we handle your bill
            </button>
          </div>
        </div>
      </div>

      {/* Offline notice if connection drops */}
      {!online && (
        <div className="bg-warn-soft text-warn text-xs font-semibold px-4 py-2 text-center flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4" /> {t.offline}
        </div>
      )}

      {/* 2. HEADER & NAVIGATION */}
      <header className="sticky top-0 z-30 bg-paper/95 backdrop-blur border-b border-line">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setActiveTab("home")}
            className="flex items-center gap-3 text-left group"
          >
            <Logo className="w-10 h-10 shrink-0 transition-transform group-hover:scale-105" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-lg sm:text-xl font-bold tracking-tight">{t.appName}</span>
                <span className="hidden sm:inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full bg-brand-soft text-muted">
                  NMBTP · Team TechNova
                </span>
              </div>
              <p className="text-xs text-muted hidden sm:block">{t.tagline}</p>
            </div>
          </button>

          {/* Language, text size, simple mode, dark mode */}
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex items-center bg-card border border-line rounded-xl px-2.5 min-h-[44px]">
              <Globe className="w-4 h-4 text-saffron-ink mr-1.5 shrink-0" />
              <select
                aria-label="Select Language"
                data-testid="language-selector"
                value={lang}
                onChange={(e) => setLang(e.target.value as SupportedLang)}
                className="bg-transparent text-ink text-xs sm:text-sm font-semibold focus:outline-none py-1.5"
              >
                {(Object.keys(LANGUAGE_LABELS) as SupportedLang[]).map((k) => (
                  <option key={k} value={k} className="text-slate-900 bg-white">
                    {LANGUAGE_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setLargeTextMode(!largeTextMode)}
              aria-label={t.largerText}
              aria-pressed={largeTextMode}
              data-testid="toggle-large-text"
              title={t.largerText}
              className={`min-h-[44px] px-3 rounded-xl border text-xs font-bold transition ${
                largeTextMode ? "bg-brand text-[rgb(var(--on-brand))] border-brand" : "bg-card border-line hover:border-brand/50"
              }`}
            >
              A+
            </button>

            <button
              type="button"
              onClick={() => setLowLiteracyMode(!lowLiteracyMode)}
              aria-label={t.simpleMode}
              aria-pressed={lowLiteracyMode}
              data-testid="toggle-low-literacy"
              title={t.simpleMode}
              className={`min-h-[44px] px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
                lowLiteracyMode ? "bg-brand text-[rgb(var(--on-brand))] border-brand" : "bg-card border-line hover:border-brand/50"
              }`}
            >
              <Volume2 className="w-4 h-4 text-saffron-ink" />
              <span className="hidden md:inline">Easy view</span>
            </button>

            <button
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              aria-label={t.darkMode}
              aria-pressed={darkMode}
              data-testid="toggle-dark-mode"
              title={t.darkMode}
              className="min-h-[44px] min-w-[44px] rounded-xl bg-card border border-line flex items-center justify-center hover:border-brand/50"
            >
              {darkMode ? <Sun className="w-4 h-4 text-saffron" /> : <Moon className="w-4 h-4 text-muted" />}
            </button>
          </div>
        </div>

        {/* Navigation strip */}
        <nav aria-label="Main Navigation" className="border-t border-line/80 bg-card/60 overflow-x-auto">
          <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 py-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-testid={`nav-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition ${
                    active
                      ? "bg-brand text-[rgb(var(--on-brand))] shadow-sm"
                      : "text-muted hover:text-ink hover:bg-brand-soft/60"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      {/* 3. MAIN WORKSPACE */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 sm:py-8">
        {/* PAGE 1: DEDICATED PROFESSIONAL LANDING PAGE ("Home & Guide") */}
        {activeTab === "home" && (
          <div data-testid="landing-home-page" className="space-y-8">
            {/* Hero Banner */}
            <section className="bg-card rounded-3xl border border-line p-7 sm:p-10 shadow-paper">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-7 space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-soft text-xs font-bold uppercase tracking-wider text-saffron-ink">
                    <ShieldCheck className="w-4 h-4" />
                    <span>National Medical Bill Transparency Platform (NMBTP)</span>
                  </div>
                  <h1 className="font-display text-3xl sm:text-5xl leading-[1.12] tracking-tight">
                    Know if your hospital bill is fair —{" "}
                    <em className="italic underline decoration-saffron decoration-2 underline-offset-4">
                      before you pay
                    </em>{" "}
                    or file a claim.
                  </h1>
                  <p className="text-base sm:text-lg text-muted max-w-2xl leading-relaxed">
                    Upload a photo or PDF of any Indian hospital or pharmacy bill. We automatically hide your personal
                    details, read every line item, compare each charge with published{" "}
                    <strong>CGHS, PM-JAY, NPPA &amp; Jan Aushadhi</strong> rates, and explain every difference in plain
                    words.
                  </p>
                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <Button
                      variant="primary"
                      onClick={() => setActiveTab("verify")}
                      data-testid="landing-start-check-btn"
                      className="min-h-[52px] px-6 text-base"
                    >
                      <Upload className="w-5 h-5 text-saffron" />
                      <span>Check my hospital bill →</span>
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setActiveTab("estimator")}
                      className="min-h-[52px] px-5 text-sm"
                    >
                      <Calculator className="w-4 h-4 text-saffron-ink" />
                      <span>Estimate treatment cost first</span>
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setActiveTab("rates")}
                      className="min-h-[52px] px-4 text-sm"
                    >
                      <Database className="w-4 h-4 text-saffron-ink" />
                      <span>Browse 87 official govt rates</span>
                    </Button>
                  </div>
                </div>

                {/* Quick Live Real-Bill Launcher Card */}
                <div className="lg:col-span-5 bg-paper rounded-2xl border border-line p-6 space-y-4">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-saffron-ink">
                      Instant Live Demo (9 Real Hospital, Lab &amp; Pharmacy Bills)
                    </div>
                    <h2 className="font-display text-xl mt-0.5">Test with a real hospital, lab or pharmacy bill</h2>
                    <p className="text-xs text-muted mt-1">
                      Click any real bill below to watch our neural OCR &amp; government rate engine audit it live:
                    </p>
                  </div>
                  <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
                    {[
                      {
                        label: "Fortis Hospitals · Ludhiana (Neurosurgery Bill)",
                        sub: "1 surgery · Craniectomy Package · ₹1,20,000 billed",
                        url: "/real-bills/fortis_craniectomy_ludhiana.jpg",
                        file: "fortis_craniectomy_ludhiana.jpg",
                      },
                      {
                        label: "Dr. Lal PathLabs · Delhi (Diagnostic Lab Receipt)",
                        sub: "4 tests · Aspergillus IgG, Fungal Culture, KOH · ₹5,060 billed",
                        url: "/real-bills/lal_pathlabs_delhi.webp",
                        file: "lal_pathlabs_delhi.webp",
                      },
                      {
                        label: "Jeevan Hospital · Pune (Inpatient Detailed Breakup)",
                        sub: "7 items · General Ward · ₹3,650 billed",
                        url: "/real-bills/jeevan_hospital_pune.png",
                        file: "jeevan_hospital_pune.png",
                      },
                      {
                        label: "Landmark Polyclinic · Pune (15-Row Full Breakup)",
                        sub: "15 items · Private & ICU + 4 Consultations · ₹5,150 billed",
                        url: "/real-bills/landmark_polyclinic_pune.jpg",
                        file: "landmark_polyclinic_pune.jpg",
                      },
                      {
                        label: "Healthians Diagnostics · Pune (Family Checkup)",
                        sub: "3 packages · Full Body Checkup + Vitamin Screen · ₹16,330 billed",
                        url: "/real-bills/healthians_fullbody_pune.jpg",
                        file: "healthians_fullbody_pune.jpg",
                      },
                      {
                        label: "Sunrise Pharmacy · Delhi (Inpatient Summary Bill)",
                        sub: "3 items · Procedure, Pathology & Consultation · ₹11,960 billed",
                        url: "/real-bills/sunrise_inpatient_delhi.png",
                        file: "sunrise_inpatient_delhi.png",
                      },
                      {
                        label: "MediCare Wholesale Pharmacy · Mumbai (GST Invoice)",
                        sub: "3 medicines · NPPA & Jan Aushadhi check · ₹2,205 taxable",
                        url: "/real-bills/medicare_pharmacy_mumbai.jpg",
                        file: "medicare_pharmacy_mumbai.jpg",
                      },
                      {
                        label: "General Hospital · Outpatient & Pharmacy Invoice",
                        sub: "6 items · Repeat Consultation + 5 Medicines · 308.94 billed",
                        url: "/real-bills/general_hospital_outpatient.jpg",
                        file: "general_hospital_outpatient.jpg",
                      },
                      {
                        label: "Froedtert Hospital · Emergency Room Statement",
                        sub: "3 items · Pharmacy, Emergency Room & EKG/ECG · 1,059.40 billed",
                        url: "/real-bills/froedtert_hospital_er.jpg",
                        file: "froedtert_hospital_er.jpg",
                      },
                    ].map((rb) => (
                      <button
                        key={rb.file}
                        type="button"
                        onClick={() => {
                          setActiveTab("verify");
                          handleQuickRealBill(rb.url, rb.file);
                        }}
                        className="w-full text-left p-3.5 rounded-xl border border-line bg-card hover:border-saffron hover:shadow-sm transition flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-ink truncate">📄 {rb.label}</div>
                          <div className="text-xs text-muted truncate">{rb.sub}</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-saffron-ink shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* IMPORTANT CITIZEN RIGHTS & LEGAL NOTICE CARD */}
            <section className="bg-warn-soft/55 rounded-2xl border border-warn/30 p-6 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-warn">
                <Scale className="w-4 h-4" />
                <span>Important Message: Your Rights &amp; How Government Reference Rates Work</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs sm:text-sm">
                <div className="p-4 rounded-xl bg-card border border-line space-y-1">
                  <div className="font-bold text-ink">1. Statutory Caps (Legally Binding)</div>
                  <p className="text-muted leading-relaxed">
                    Under the <strong>Drugs (Prices Control) Order (DPCO) / NPPA</strong>, every hospital and pharmacy in
                    India—private or public—is legally prohibited from charging above the ceiling price for coronary
                    stents, orthopaedic knee implants, and scheduled NLEM medicines.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-card border border-line space-y-1">
                  <div className="font-bold text-ink">2. CGHS &amp; PM-JAY Rates (Reference Benchmarks)</div>
                  <p className="text-muted leading-relaxed">
                    Private hospitals are <strong>not legally bound</strong> to charge CGHS or PM-JAY rates unless you are
                    an eligible beneficiary at an empanelled hospital. We show them as official government reference
                    benchmarks so you can ask polite, informed questions.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-card border border-line space-y-1">
                  <div className="font-bold text-ink">3. Right to an Itemized Bill &amp; Privacy</div>
                  <p className="text-muted leading-relaxed">
                    Under the <strong>Consumer Protection Act 2019</strong> and Clinical Establishments Rules, you have the
                    right to a detailed breakup before paying. Under the <strong>DPDP Act 2023</strong>, we redact your
                    name, phone, Aadhaar, and UHID automatically.
                  </p>
                </div>
              </div>
            </section>

            {/* CHOOSE BY USER INTENT: 4 DEDICATED WORKFLOW CARDS */}
            <section className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-saffron-ink">Guided Citizen Pathways</p>
                  <h2 className="font-display text-2xl sm:text-3xl mt-0.5">Where would you like to start?</h2>
                </div>
                <p className="text-xs text-muted max-w-md">
                  Explore one step at a time. Each tool connects directly with our official government tariffs and OCR audit engine.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    id: "verify" as ActiveTab,
                    icon: FileCheck2,
                    badge: "Primary workflow",
                    title: "Audit a Hospital or Pharmacy Bill",
                    desc: "Upload any bill photo or PDF. Watch neural OCR extract line items, mask personal details, and benchmark against CGHS/NPPA rates.",
                    cta: "Check my bill now →",
                  },
                  {
                    id: "estimator" as ActiveTab,
                    icon: Calculator,
                    badge: "Before admission",
                    title: "Pre-Treatment Cost Estimator",
                    desc: "Planning surgery? Get expected government package rates, typical private quote ranges, and mandatory inclusions before signing admission.",
                    cta: "Estimate surgery cost →",
                  },
                  {
                    id: "rates" as ActiveTab,
                    icon: Database,
                    badge: "87 official rates",
                    title: "Official Government Rates Explorer",
                    desc: "Search CGHS 2024 tariffs, PM-JAY HBP 2.2 surgical packages, NPPA statutory price caps, and Jan Aushadhi generic MRPs.",
                    cta: "Search rate database →",
                  },
                  {
                    id: "hash_lookup" as ActiveTab,
                    icon: QrCode,
                    badge: "Cryptographic proof",
                    title: "Verify Report Authenticity",
                    desc: "Check any SwasthyaBillCheck PDF QR code or 64-character hash against our append-only SHA-256 tamper-evident ledger.",
                    cta: "Verify report code →",
                  },
                ].map((card) => {
                  const Icon = card.icon;
                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => setActiveTab(card.id)}
                      className="text-left bg-card rounded-2xl border border-line p-5 shadow-paper hover:border-saffron hover:shadow-lift transition flex flex-col justify-between gap-4 group"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="w-10 h-10 rounded-xl bg-brand-soft text-saffron-ink flex items-center justify-center transition-transform group-hover:scale-110">
                            <Icon className="w-5 h-5" />
                          </span>
                          <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-paper border border-line text-muted">
                            {card.badge}
                          </span>
                        </div>
                        <h3 className="font-display text-lg font-bold text-ink group-hover:text-saffron-ink transition-colors">
                          {card.title}
                        </h3>
                        <p className="text-xs text-muted leading-relaxed">{card.desc}</p>
                      </div>
                      <span className="text-xs font-bold text-saffron-ink inline-flex items-center gap-1 group-hover:underline">
                        {card.cta}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {/* PAGE 2: DEDICATED BILL CHECK & AUDIT WORKSPACE ("Check a bill") */}
        {activeTab === "verify" && (
          <div className="space-y-7">
            {/* 4-STAGE PROGRESS MILESTONE TRACKER (Inspired by Goodbill & FAIR Health Consumer) */}
            <div
              data-testid="audit-milestone-tracker"
              className="bg-card rounded-2xl border border-line px-4 py-3.5 shadow-paper flex flex-wrap items-center justify-between gap-3"
            >
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs">
                {[
                  { num: 1, label: "1. Bill Selected / Uploaded", active: true },
                  { num: 2, label: `2. OCR Read (${editableLines.length} items)`, active: editableLines.length > 0 },
                  { num: 3, label: "3. Govt Rate Audit Complete", active: Boolean(vSummary) },
                  {
                    num: 4,
                    label:
                      vSummary?.flagged_count > 0
                        ? `4. Next Step: Ask hospital about ${vSummary.flagged_count} flagged item(s)`
                        : "4. All items within govt benchmark",
                    active: Boolean(vSummary),
                  },
                ].map((m) => (
                  <div key={m.num} className="flex items-center gap-1.5">
                    <span
                      className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                        m.active ? "bg-ok text-white" : "bg-brand-soft text-muted"
                      }`}
                    >
                      {m.active ? "✓" : m.num}
                    </span>
                    <span className={m.active ? "font-bold text-ink" : "text-muted"}>{m.label}</span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("home")}
                className="text-xs font-semibold text-saffron-ink underline"
              >
                ← Back to Home &amp; Guide
              </button>
            </div>

            {/* WELCOMING FIRST-TIME USER HERO + UPLOAD / SAMPLE PICKER */}
            <section
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const f = e.dataTransfer.files?.[0];
                if (f) processUploadedFile(f);
              }}
              className={`bg-card rounded-2xl border p-6 sm:p-7 shadow-paper transition ${
                isDragging ? "border-saffron ring-2 ring-saffron/40" : "border-line"
              }`}
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-7 space-y-3">
                  <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-saffron-ink">
                    <span>{t.heroEyebrow}</span>
                  </div>
                  <h1 className="font-display text-2xl sm:text-4xl leading-[1.15] tracking-tight">
                    {t.heroTitleA}
                    <em className="italic underline decoration-saffron decoration-2 underline-offset-4">{t.heroTitleEm}</em>
                    {t.heroTitleB}
                  </h1>
                  <p className="text-sm sm:text-base text-muted max-w-2xl leading-relaxed">{t.heroBody}</p>

                  {/* 3-step ribbon so a first-time visitor immediately gets how it works */}
                  <ol className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    {t.howSteps.map((st, i) => (
                      <li key={i} className="p-3 rounded-xl bg-paper border border-line/80 flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-brand text-[rgb(var(--on-brand))] font-bold text-[11px] inline-flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <div>
                          <div className="font-semibold text-ink">{st.title}</div>
                          <div className="text-muted mt-0.5 leading-snug">{st.body}</div>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Right side: big friendly upload dropzone + camera + fix reading */}
                <div className="lg:col-span-5 bg-paper rounded-2xl border-2 border-dashed border-line p-5 space-y-3">
                  <div className="flex flex-wrap gap-2.5">
                    <label
                      data-testid="upload-bill-label"
                      className={buttonClass("primary", "flex-1 cursor-pointer text-sm")}
                    >
                      <Upload className="w-4 h-4 text-saffron" />
                      <span>{t.uploadBill}</span>
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg,.webp,.pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                        data-testid="file-upload-input"
                      />
                    </label>

                    <Button variant="secondary" onClick={startCameraCapture} data-testid="camera-capture-btn">
                      <Camera className="w-4 h-4 text-saffron-ink" />
                      <span>{t.cameraCapture}</span>
                    </Button>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>{t.uploadHint}</span>
                    <button
                      type="button"
                      onClick={() => setStepMode(stepMode === "review" ? "report" : "review")}
                      data-testid="toggle-ocr-edit-btn"
                      className="font-semibold text-saffron-ink underline inline-flex items-center gap-1 py-1"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>{stepMode === "review" ? t.backToReport : t.fixReading}</span>
                    </button>
                  </div>

                  {/* Sample bill picker with human titles */}
                  <div className="pt-2 border-t border-line space-y-2.5">
                    <div>
                      <label htmlFor="demo-bill-select" className="block text-xs font-semibold text-muted mb-1">
                        {t.trySampleBill}
                      </label>
                      <select
                        id="demo-bill-select"
                        aria-label="Select sample hospital bill"
                        data-testid="demo-bill-selector"
                        value={selectedBillId}
                        onChange={(e) => {
                          const found = demoBills.find((b) => b.bill_id === e.target.value);
                          if (found) handleSelectDemoBill(found);
                        }}
                        className="w-full min-h-[44px] rounded-xl border border-line bg-card px-3 text-xs sm:text-sm font-semibold"
                      >
                        <option value="">-- Choose a sample bill to inspect --</option>
                        {demoBills.map((b, idx) => (
                          <option key={b.bill_id} value={b.bill_id}>
                            {friendlyBillTitle(b, idx)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* One-click real bill photos that run through the live RapidOCR + OpenCV pipeline */}
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5">
                        Or click any real bill to test live OCR:
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {[
                          { label: "Fortis Craniectomy", url: "/real-bills/fortis_craniectomy_ludhiana.jpg", file: "fortis_craniectomy_ludhiana.jpg" },
                          { label: "Dr. Lal PathLabs", url: "/real-bills/lal_pathlabs_delhi.webp", file: "lal_pathlabs_delhi.webp" },
                          { label: "Jeevan Hospital", url: "/real-bills/jeevan_hospital_pune.png", file: "jeevan_hospital_pune.png" },
                          { label: "Landmark (15 rows)", url: "/real-bills/landmark_polyclinic_pune.jpg", file: "landmark_polyclinic_pune.jpg" },
                          { label: "Healthians Checkup", url: "/real-bills/healthians_fullbody_pune.jpg", file: "healthians_fullbody_pune.jpg" },
                          { label: "Sunrise Inpatient", url: "/real-bills/sunrise_inpatient_delhi.png", file: "sunrise_inpatient_delhi.png" },
                          { label: "MediCare Pharmacy", url: "/real-bills/medicare_pharmacy_mumbai.jpg", file: "medicare_pharmacy_mumbai.jpg" },
                          { label: "General Hospital", url: "/real-bills/general_hospital_outpatient.jpg", file: "general_hospital_outpatient.jpg" },
                          { label: "Froedtert ER Bill", url: "/real-bills/froedtert_hospital_er.jpg", file: "froedtert_hospital_er.jpg" },
                        ].map((rb) => (
                          <button
                            key={rb.file}
                            type="button"
                            onClick={() => handleQuickRealBill(rb.url, rb.file)}
                            className="text-left px-2.5 py-1.5 rounded-lg border border-line bg-card hover:border-saffron hover:bg-brand-soft/40 text-xs font-semibold truncate transition"
                          >
                            📄 {rb.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* HOSPITAL CONTEXT BAR: Plain words + tooltips for CGHS City Tier, Room Type, NABH */}
              <div className="mt-6 pt-5 border-t border-line flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="max-w-xs">
                  <div className="text-sm font-bold">{t.contextTitle}</div>
                  <p className="text-xs text-muted">{t.contextBody}</p>
                </div>

                <div className="flex flex-wrap items-end gap-5">
                  <Segmented
                    label={t.cityLabel}
                    hint={<InfoTip text={t.cityTip} />}
                    value={cityTier}
                    options={[
                      { value: "X", label: t.cityMetro },
                      { value: "Y", label: t.cityMid },
                      { value: "Z", label: t.citySmall },
                    ]}
                    onChange={(nextTier) => {
                      setCityTier(nextTier);
                      runVerificationRequest(editableLines, hospitalName, stateCode, nextTier, nabhAccredited, wardType, stayDays);
                    }}
                  />

                  <Segmented
                    label={t.roomLabel}
                    value={wardType}
                    options={[
                      { value: "general", label: t.roomGeneral },
                      { value: "semi_private", label: t.roomShared },
                      { value: "private", label: t.roomPrivate },
                    ]}
                    onChange={(nextWard) => {
                      setWardType(nextWard);
                      runVerificationRequest(editableLines, hospitalName, stateCode, cityTier, nabhAccredited, nextWard, stayDays);
                    }}
                  />

                  <div>
                    <div className="text-sm font-semibold text-muted mb-1.5 flex items-center gap-1.5">
                      <span>{t.nabhLabel}</span>
                      <InfoTip text={t.nabhTip} />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const nextNabh = !nabhAccredited;
                        setNabhAccredited(nextNabh);
                        runVerificationRequest(editableLines, hospitalName, stateCode, cityTier, nextNabh, wardType, stayDays);
                      }}
                      data-testid="nabh-toggle-btn"
                      className={`min-h-[44px] px-4 rounded-full text-sm font-semibold border transition ${
                        nabhAccredited
                          ? "bg-ok text-white border-ok dark:text-[#120C22]"
                          : "bg-card border-line text-ink hover:border-brand/50"
                      }`}
                    >
                      {nabhAccredited ? `${t.nabhYes} (NABH)` : `${t.nabhNo} (-15%)`}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* LIVE ANIMATED PROCESSING BANNER WHEN READING OR CHECKING A BILL */}
            <AnimatePresence>
              {isScanning && (
                <motion.section
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  data-testid="live-processing-banner"
                  className="bg-brand text-[rgb(var(--on-brand))] rounded-2xl p-5 sm:p-6 shadow-lift border border-saffron/40"
                >
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                    <div className="md:col-span-3 relative rounded-xl overflow-hidden border border-white/20 bg-black/40 h-32 flex items-center justify-center">
                      {previewImageUrl && (
                        <img
                          src={previewImageUrl}
                          alt="Scanning bill preview"
                          className="h-full w-full object-cover opacity-75"
                        />
                      )}
                      <div className="scan-line" />
                      <span className="absolute bottom-2 left-2 right-2 text-[11px] font-mono bg-black/75 text-white px-2 py-0.5 rounded truncate text-center">
                        Scanning bill...
                      </span>
                    </div>

                    <div className="md:col-span-9 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-display text-lg sm:text-xl font-bold flex items-center gap-2">
                          <span className="inline-block w-3 h-3 rounded-full bg-saffron animate-ping" />
                          <span>Reading & checking your hospital bill...</span>
                        </div>
                        <span className="text-xs font-mono uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/10">
                          {processingStage === 1
                            ? "Step 1 of 4 · Image Cleanup"
                            : processingStage === 2
                            ? "Step 2 of 4 · Neural OCR"
                            : processingStage === 3
                            ? "Step 3 of 4 · Privacy Guard"
                            : "Step 4 of 4 · Rate Matching"}
                        </span>
                      </div>

                      {/* Animated progress bar */}
                      <div className="w-full h-2.5 rounded-full bg-white/15 overflow-hidden">
                        <motion.div
                          className="h-full bg-saffron"
                          initial={{ width: "15%" }}
                          animate={{
                            width:
                              processingStage === 1
                                ? "28%"
                                : processingStage === 2
                                ? "58%"
                                : processingStage === 3
                                ? "82%"
                                : "96%",
                          }}
                          transition={{ duration: 0.35 }}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                        {[
                          { step: 1, title: "1. Straighten & clean", sub: "OpenCV deskew & denoise" },
                          { step: 2, title: "2. Read table rows", sub: "RapidOCR neural engine" },
                          { step: 3, title: "3. Hide personal info", sub: "DPDP Act 2023 redaction" },
                          { step: 4, title: "4. Check govt rates", sub: "CGHS · PM-JAY · NPPA" },
                        ].map((s) => {
                          const done = (processingStage || 4) >= s.step;
                          return (
                            <div
                              key={s.step}
                              className={`p-2.5 rounded-xl border transition ${
                                done
                                  ? "bg-white/15 border-saffron/60 text-white"
                                  : "bg-white/5 border-white/10 text-white/60"
                              }`}
                            >
                              <div className="font-bold flex items-center gap-1.5">
                                <CheckCircle2 className={`w-3.5 h-3.5 ${done ? "text-saffron" : "opacity-40"}`} />
                                <span>{s.title}</span>
                              </div>
                              <div className="text-[11px] opacity-80 mt-0.5">{s.sub}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            {/* UPLOADED BILL PROCESSED CONFIRMATION STRIP */}
            {uploadedBillMeta && !isScanning && (
              <div
                data-testid="uploaded-bill-status-bar"
                className="bg-ok-soft border border-ok/30 rounded-2xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-full bg-ok text-white flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </span>
                  <div>
                    <div className="text-sm font-bold text-ink">
                      Checked your uploaded bill: <span className="underline">{uploadedBillMeta.hospital}</span> (
                      {uploadedBillMeta.lineCount} items read from <span className="font-mono text-xs">{uploadedBillMeta.filename}</span>)
                    </div>
                    <div className="text-xs text-muted">
                      Engine: {uploadedBillMeta.engine} · DPDP Privacy Guard active · All report cards below now show this bill
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setStepMode(stepMode === "review" ? "report" : "review")}
                >
                  {stepMode === "review" ? "Hide row editor" : `Review / edit ${uploadedBillMeta.lineCount} rows`}
                </Button>
              </div>
            )}

            {/* LOW-LITERACY VOICE + ICON SUMMARY BAR */}
            {lowLiteracyMode && (
              <LowLiteracyBar
                summary={vSummary}
                onSpeak={speakReportSummary}
                onDispute={() => setShowDisputeModal(true)}
                onWhatsApp={shareOnWhatsApp}
                t={t}
              />
            )}

            {/* STEP MODE: EDITABLE OCR REVIEW TABLE ("Did we read your bill right?") */}
            {stepMode === "review" && (
              <section
                data-testid="ocr-review-screen"
                className="bg-card rounded-2xl p-6 shadow-paper border border-line space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl">{t.reviewTitle}</h2>
                    <p className="text-xs sm:text-sm text-muted">{t.reviewBody}</p>
                  </div>
                  <Button
                    variant="accent"
                    onClick={() => runVerificationRequest(editableLines)}
                    data-testid="confirm-ocr-verify-btn"
                  >
                    <CheckCircle2 className="w-4 h-4" /> {t.reviewConfirm}
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-line text-xs uppercase tracking-wider text-muted">
                        <th className="py-2.5 px-2">#</th>
                        <th className="py-2.5 px-2">{t.reviewItem}</th>
                        <th className="py-2.5 px-2 w-24">{t.reviewQty}</th>
                        <th className="py-2.5 px-2 w-36">{t.reviewPrice}</th>
                        <th className="py-2.5 px-2 w-32">{t.reviewTotal}</th>
                        <th className="py-2.5 px-2">Read accuracy</th>
                        <th className="py-2.5 px-2 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {editableLines.map((line, i) => {
                        const lowConf = line.confidence < 0.8;
                        return (
                          <tr key={i} className={lowConf ? "bg-warn-soft/50" : ""}>
                            <td className="py-2.5 px-2 font-semibold text-muted">{i + 1}</td>
                            <td className="py-2.5 px-2">
                              <input
                                type="text"
                                value={line.raw_text}
                                onChange={(e) => {
                                  const copy = [...editableLines];
                                  copy[i] = { ...copy[i], raw_text: e.target.value, confidence: 0.99 };
                                  setEditableLines(copy);
                                }}
                                className="w-full min-h-[42px] rounded-xl border border-line bg-paper px-3 text-sm font-medium"
                              />
                              {lowConf && (
                                <span className="inline-block mt-1 text-xs font-semibold text-warn">{t.reviewCheckThis}</span>
                              )}
                            </td>
                            <td className="py-2.5 px-2">
                              <input
                                type="number"
                                min={1}
                                value={line.qty}
                                onChange={(e) => {
                                  const q = Number(e.target.value) || 1;
                                  const copy = [...editableLines];
                                  copy[i] = { ...copy[i], qty: q, total: q * copy[i].unit_price };
                                  setEditableLines(copy);
                                }}
                                className="w-full min-h-[42px] rounded-xl border border-line bg-paper px-2.5 text-sm tnum"
                              />
                            </td>
                            <td className="py-2.5 px-2">
                              <input
                                type="number"
                                value={line.unit_price}
                                onChange={(e) => {
                                  const up = Number(e.target.value) || 0;
                                  const copy = [...editableLines];
                                  copy[i] = { ...copy[i], unit_price: up, total: copy[i].qty * up };
                                  setEditableLines(copy);
                                }}
                                className="w-full min-h-[42px] rounded-xl border border-line bg-paper px-2.5 text-sm tnum"
                              />
                            </td>
                            <td className="py-2.5 px-2 font-bold tnum">{inr(line.total)}</td>
                            <td className="py-2.5 px-2">
                              <ConfidenceRing confidence={line.confidence} />
                            </td>
                            <td className="py-2.5 px-2">
                              {editableLines.length > 1 && (
                                <button
                                  type="button"
                                  aria-label={t.reviewRemove}
                                  onClick={() => setEditableLines(editableLines.filter((_, idx) => idx !== i))}
                                  className="p-2 rounded-lg text-muted hover:text-flag"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setEditableLines([
                      ...editableLines,
                      { raw_text: "Complete Blood Count (CBC)", qty: 1, unit_price: 300, total: 300, confidence: 0.99 },
                    ])
                  }
                >
                  <Plus className="w-4 h-4" /> {t.reviewAddItem}
                </Button>
              </section>
            )}

            {/* EMPTY STATE: USER HAS NOT YET SELECTED OR UPLOADED A BILL */}
            {!verificationData && !isScanning && (
              <div
                data-testid="no-bill-selected-empty-state"
                className="bg-card rounded-3xl border border-line p-8 sm:p-12 text-center space-y-4 shadow-paper max-w-3xl mx-auto"
              >
                <div className="w-16 h-16 rounded-2xl bg-brand-soft text-saffron-ink flex items-center justify-center mx-auto">
                  <FileCheck2 className="w-8 h-8" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="font-display text-2xl sm:text-3xl text-ink">
                    No bill loaded yet
                  </h2>
                  <p className="text-sm text-muted max-w-lg mx-auto">
                    Please upload your hospital bill photo / PDF above, or pick one of the 9 sample bills to watch the live OCR and government rate audit in action.
                  </p>
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                  <label
                    htmlFor="empty-state-upload"
                    className={buttonClass("primary", "cursor-pointer text-sm min-h-[46px] px-5")}
                  >
                    <Upload className="w-4 h-4 text-saffron" />
                    <span>Upload my bill (Photo/PDF)</span>
                    <input
                      id="empty-state-upload"
                      type="file"
                      accept=".png,.jpg,.jpeg,.webp,.pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (demoBills.length > 0) {
                        handleSelectDemoBill(demoBills[0]);
                      } else {
                        handleQuickRealBill(
                          "/real-bills/fortis_craniectomy_ludhiana.jpg",
                          "fortis_craniectomy_ludhiana.jpg"
                        );
                      }
                    }}
                    className="min-h-[46px] px-5 text-sm"
                  >
                    <Eye className="w-4 h-4 text-saffron-ink" />
                    <span>Try with sample bill</span>
                  </Button>
                </div>
              </div>
            )}

            {/* MAIN REPORT WORKSPACE: LEFT = PAPER RECEIPT CARD + BILL X-RAY, RIGHT = PLAIN-LANGUAGE BREAKDOWN */}
            {verificationData && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
              {/* LEFT COLUMN (5 cols): THE CIVIC RECEIPT CARD (Matches Deck Slide 3) */}
              <div className="lg:col-span-5 space-y-5">
                <div data-testid="deck-slide3-report-card" className="receipt px-6 py-7 space-y-4">
                  {/* Receipt masthead */}
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-line">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-brand-soft text-muted">
                          {isSampleBill ? t.sampleResultLabel : t.yourResultLabel}
                        </span>
                        <span className="text-xs text-muted font-mono">Tier {cityTier}</span>
                      </div>
                      <h2 className="font-display text-xl mt-1">{t.billReport}</h2>
                      <p className="text-xs text-muted">{hospitalName}</p>
                    </div>
                    <button
                      type="button"
                      onClick={speakReportSummary}
                      aria-label={t.voiceReadout}
                      data-testid="voice-readout-btn"
                      title={t.voiceReadout}
                      className="w-11 h-11 rounded-full bg-brand-soft hover:bg-saffron hover:text-[#1E1240] flex items-center justify-center transition shrink-0"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Scanning state */}
                  {isScanning && (
                    <div className="relative h-20 rounded-xl bg-brand-soft/70 overflow-hidden flex items-center justify-center text-xs font-semibold">
                      <div className="scan-line" />
                      <span>{t.readingBill}</span>
                    </div>
                  )}

                  {/* Line items with dotted leader lines */}
                  <div className="space-y-2.5">
                    <AnimatePresence mode="popLayout">
                      {vLines.map((line: any, idx: number) => {
                        const isFlagged = line.status === "above_reference";
                        return (
                          <motion.div
                            key={line.line_id || idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ type: "spring", stiffness: 280, damping: 24, delay: idx * 0.05 }}
                            onClick={() => setEvidenceDrawerLine(line)}
                            data-testid={`report-line-${idx}`}
                            className={`rounded-xl p-3.5 cursor-pointer transition border ${
                              isFlagged
                                ? "bg-flag-soft/75 border-flag/30 pulse-once"
                                : "bg-paper/80 border-line hover:border-brand/40"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="font-bold text-base text-ink truncate">
                                  {lang === "hi" ? line.canonical_name_hi : line.raw_text}
                                </div>
                                <div className="text-xs sm:text-sm text-muted mt-0.5 tnum">
                                  {t.billedLabel} ₹{Number(line.billed_total).toLocaleString("en-IN")} &nbsp;|&nbsp;{" "}
                                  {t.rateLabel} ₹
                                  {line.reference_total !== null
                                    ? Number(line.reference_total).toLocaleString("en-IN")
                                    : "N/A"}
                                </div>
                              </div>

                              {isFlagged ? (
                                <span
                                  aria-label={t.aboveReferenceBadge}
                                  className="w-10 h-10 rounded-full bg-flag text-white dark:text-[#120C22] flex items-center justify-center shrink-0"
                                >
                                  <AlertTriangle className="w-5 h-5" />
                                </span>
                              ) : (
                                <span
                                  aria-label={t.withinReferenceBadge}
                                  className="w-10 h-10 rounded-full bg-ok text-white dark:text-[#120C22] flex items-center justify-center shrink-0"
                                >
                                  <CheckCircle2 className="w-5 h-5" />
                                </span>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>

                  <div className="dotted-rule my-2" />

                  {/* Rubber-stamp verdict ("1 item above approved rate") */}
                  {vSummary && (
                    <div className="py-1 flex justify-center">
                      <div
                        data-testid="flagged-count-banner"
                        className={`stamp text-sm ${vSummary.flagged_count > 0 ? "text-flag" : "text-ok"}`}
                      >
                        {vSummary.flagged_count > 0 ? (
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                        )}
                        <span>{t.aboveApprovedRateSummary(vSummary.flagged_count)}</span>
                      </div>
                    </div>
                  )}

                  {/* Download PDF report button */}
                  {vLedger && (
                    <a
                      href={`/api/report/${vLedger.report_hash}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid="download-report-btn"
                      className={buttonClass("accent", "w-full min-h-[52px] text-base font-bold")}
                    >
                      <Download className="w-5 h-5" />
                      <span>{t.downloadReport}</span>
                    </a>
                  )}
                </div>

                {/* SEE IT ON YOUR BILL (Bill X-Ray) */}
                <div className="bg-card rounded-2xl p-4 shadow-paper border border-line space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-saffron-ink" />
                      <div>
                        <h3 className="font-semibold text-sm">{t.billXrayToggle}</h3>
                        <p className="text-xs text-muted">{t.billXrayHint}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={showXray ? "primary" : "secondary"}
                      onClick={() => setShowXray(!showXray)}
                      data-testid="bill-xray-toggle-btn"
                    >
                      {showXray ? t.billXrayHide : t.billXrayShow}
                    </Button>
                  </div>

                  {showXray && (
                    <div
                      data-testid="bill-xray-canvas"
                      className="relative rounded-xl overflow-hidden border border-line bg-[#120C22]"
                    >
                      <img src={previewImageUrl} alt="Hospital bill with highlighted charges" className="w-full h-auto block opacity-95" />
                      {vLines.map((line: any, idx: number) => {
                        const box = line.bbox || { x: 0.04, y: 0.235 + idx * 0.038, w: 0.92, h: 0.036 };
                        const isFlag = line.status === "above_reference";
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setEvidenceDrawerLine(line)}
                            style={{
                              left: `${box.x * 100}%`,
                              top: `${box.y * 100}%`,
                              width: `${box.w * 100}%`,
                              height: `${box.h * 100}%`,
                            }}
                            className={`absolute border-2 rounded transition ${
                              isFlag
                                ? "border-red-500 bg-red-500/25 hover:bg-red-500/40"
                                : "border-emerald-500 bg-emerald-500/15 hover:bg-emerald-500/30"
                            }`}
                            title={`${line.raw_text}: Billed ₹${line.billed_total} vs Rate ₹${line.reference_total}`}
                          >
                            <span
                              className={`absolute -top-5 right-1 px-1.5 py-0.2 rounded text-[10px] font-bold text-white ${
                                isFlag ? "bg-red-600" : "bg-emerald-600"
                              }`}
                            >
                              {isFlag ? `+₹${line.delta_amount}` : "OK"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN (7 cols): CONVERSATIONAL SUMMARY, LINE-BY-LINE BREAKDOWN & PROOF */}
              <div className="lg:col-span-7 space-y-5">
                {/* 1. Plain-language takeaway + three numbers + Important Findings Callout + next-step buttons */}
                {vSummary && (
                  <div
                    data-testid="executive-summary-card"
                    className="bg-card rounded-2xl p-6 shadow-paper border border-line space-y-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-soft text-[11px] font-bold uppercase tracking-wider text-ink">
                          <ShieldCheck className="w-3.5 h-3.5 text-saffron-ink" /> Official Audit Executive Summary
                        </span>
                        <p className="font-display text-lg sm:text-xl leading-snug pt-0.5">
                          {t.summarySentence(
                            vSummary.total_lines,
                            vSummary.ok_count,
                            vSummary.flagged_count,
                            vSummary.needs_confirmation_count + vSummary.cannot_verify_count
                          )}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-xl text-xs font-bold border ${
                          vSummary.flagged_count > 0
                            ? "bg-flag-soft text-flag border-flag/30"
                            : "bg-ok-soft text-ok border-ok/30"
                        }`}
                      >
                        {vSummary.flagged_count > 0
                          ? `Action Recommended · ${vSummary.flagged_count} item(s) above govt rate`
                          : "All items within government reference"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div className="p-4 rounded-xl bg-paper border border-line">
                        <div className="text-xs font-semibold text-muted">{t.totalBilled}</div>
                        <div className="font-display text-2xl sm:text-3xl mt-1">
                          <CountUp value={vSummary.billed_total} />
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-ok-soft/65 border border-ok/25">
                        <div className="text-xs font-semibold text-ok">{t.govtRate}</div>
                        <div className="font-display text-2xl sm:text-3xl text-ok mt-1">
                          <CountUp value={vSummary.reference_total} />
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-warn-soft/75 border border-warn/30">
                        <div className="text-xs font-semibold text-warn">{t.potentialSavings}</div>
                        <div
                          data-testid="potential-savings-amount"
                          className="font-display text-2xl sm:text-3xl text-saffron-ink mt-1"
                        >
                          <CountUp value={vSummary.potential_savings} />
                        </div>
                        <div className="text-[11px] text-muted mt-0.5">
                          {inr(vSummary.potential_savings_range.min)} – {inr(vSummary.potential_savings_range.max)} · {t.notEntitlement}
                        </div>
                      </div>
                    </div>

                    {/* Prominent Important Message & Key Findings Box */}
                    <div
                      data-testid="important-findings-banner"
                      className={`p-4 rounded-xl border space-y-2 ${
                        vSummary.flagged_count > 0
                          ? "bg-warn-soft/45 border-warn/35"
                          : "bg-ok-soft/45 border-ok/30"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-saffron-ink" />
                          Important Findings & Citizen Guidance
                        </div>
                        <span className="text-[11px] font-semibold text-muted">
                          Who acts next: {vSummary.flagged_count > 0 ? "Patient / Billing Desk Query" : "No dispute needed"}
                        </span>
                      </div>

                      {vSummary.flagged_count > 0 ? (
                        <ul className="text-xs text-ink/90 space-y-1.5 pl-4 list-disc">
                          {vLines
                            .filter((l: any) => l.status === "above_reference")
                            .slice(0, 3)
                            .map((l: any, i: number) => (
                              <li key={i}>
                                <strong>{lang === "hi" ? l.canonical_name_hi : l.canonical_name}:</strong> Billed{" "}
                                <strong className="tnum">{inr(l.billed_total)}</strong> vs. {l.evidence?.scheme || "Govt"}{" "}
                                reference <strong className="tnum text-ok">{inr(l.reference_total)}</strong> (
                                <span className="text-flag font-bold tnum">+{inr(l.delta_amount)}</span>).
                              </li>
                            ))}
                          <li className="text-muted">
                            <strong>Legal Context:</strong> Private hospitals set their own tariffs unless empaneled under
                            CGHS/PM-JAY, except <strong>NPPA DPCO capped drugs & implants</strong> which are legally binding
                            nationwide. Use these figures to politely request an itemized review at the billing desk.
                          </li>
                        </ul>
                      ) : (
                        <p className="text-xs text-ink/85 leading-relaxed">
                          Every line item on this bill is at or below the official Indian government benchmark (CGHS / PM-JAY /
                          NPPA / Jan Aushadhi). You can download the cryptographically signed report for your records.
                        </p>
                      )}
                    </div>

                    {/* Bill-level anomalies (e.g. grand total mismatch) */}
                    {vAnomalies.length > 0 && (
                      <div className="p-3.5 rounded-xl bg-flag-soft border border-flag/30 text-xs space-y-1">
                        {vAnomalies.map((a, i) => (
                          <div key={i} className="font-semibold text-flag">
                            • {a[elang === "hi" ? "message_hi" : "message_en"] || a.message_en}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Action buttons in plain words */}
                    <div className="pt-2 border-t border-line flex flex-wrap items-center gap-2.5">
                      <Button
                        variant="primary"
                        onClick={() => setShowDisputeModal(true)}
                        data-testid="open-dispute-modal-btn"
                      >
                        <Scale className="w-4 h-4 text-saffron" />
                        <span>{t.generateDisputeLetter}</span>
                      </Button>

                      <Button variant="secondary" onClick={speakReportSummary}>
                        <Volume2 className="w-4 h-4 text-saffron-ink" />
                        <span>{t.voiceReadout}</span>
                      </Button>

                      <Button variant="secondary" onClick={shareOnWhatsApp} data-testid="whatsapp-share-btn">
                        <Share2 className="w-4 h-4 text-ok" />
                        <span>{t.whatsappShare}</span>
                      </Button>
                    </div>
                  </div>
                )}

                {/* 2. Line-by-line filter bar + plain-language cards */}
                <div className="space-y-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-card px-4 py-3 rounded-xl border border-line">
                    <div className="text-xs font-bold uppercase tracking-wider text-muted">
                      Line-by-Line Audit Breakdown ({vLines.length} items)
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Filter bill items">
                      {[
                        { id: "all", label: `All items (${vLines.length})` },
                        {
                          id: "flagged",
                          label: `Needs attention (${vLines.filter((l: any) => l.status === "above_reference").length})`
                        },
                        {
                          id: "ok",
                          label: `Within govt rate (${vLines.filter((l: any) => l.status === "ok").length})`
                        }
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setLineFilter(tab.id as any)}
                          data-testid={`filter-lines-${tab.id}`}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                            lineFilter === tab.id
                              ? "bg-ink text-paper shadow-sm"
                              : "bg-paper text-muted hover:text-ink border border-line"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {vLines
                    .filter((line: any) => {
                      if (lineFilter === "flagged") return line.status === "above_reference";
                      if (lineFilter === "ok") return line.status === "ok";
                      return true;
                    })
                    .map((line: any, idx: number) => {
                    const isFlagged = line.status === "above_reference";
                    const ev = line.evidence || {};
                    const question = line.hospital_question_i18n?.[elang];
                    return (
                      <article
                        key={line.line_id || idx}
                        className={`bg-card rounded-2xl p-5 shadow-paper border transition ${
                          isFlagged ? "border-flag/35" : "border-line"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                  isFlagged ? "bg-flag-soft text-flag" : "bg-ok-soft text-ok"
                                }`}
                              >
                                {isFlagged ? t.aboveReferenceBadge : t.withinReferenceBadge}
                              </span>
                              {ev.scheme && ev.scheme !== "NONE" && (
                                <span className="px-2 py-0.5 rounded-md bg-brand-soft text-xs font-semibold">
                                  <Term meaning={SCHEME_MEANING[ev.scheme] || ev.scheme}>{ev.scheme}</Term> · {ev.rate_code}
                                </span>
                              )}
                              {ev.is_sample_seed && (
                                <span className="px-2 py-0.5 rounded-md bg-warn-soft text-warn text-[11px] font-semibold">
                                  Reference seed
                                </span>
                              )}
                            </div>

                            <h3 className="font-display text-lg leading-snug pt-0.5">
                              {lang === "hi" ? line.canonical_name_hi : line.canonical_name}
                            </h3>
                            {line.raw_text !== line.canonical_name && (
                              <div className="text-xs text-muted">
                                {t.asWrittenOnBill}: “{line.raw_text}”
                              </div>
                            )}
                            {line.plain_term_meaning_i18n?.[elang] && (
                              <p className="text-xs text-muted">{line.plain_term_meaning_i18n[elang]}</p>
                            )}
                          </div>

                          <div className="text-right tnum">
                            <div className="text-sm font-bold">
                              {t.billedLabel}: {inr(line.billed_total)}
                            </div>
                            <div className="text-xs font-semibold text-ok">
                              {ev.scheme || "Govt"} {t.rateLabel.toLowerCase()}: {inr(line.reference_total)}
                            </div>
                            {isFlagged && (
                              <div className="text-xs font-bold text-flag mt-0.5">
                                +{inr(line.delta_amount)} (+{line.delta_pct}%)
                              </div>
                            )}
                          </div>
                        </div>

                        <p className="mt-3 text-sm leading-relaxed bg-paper p-3.5 rounded-xl border border-line/80">
                          {line.explanation_i18n?.[elang]}
                        </p>

                        {/* For flagged items, show the exact polite question right on the card */}
                        {isFlagged && question && (
                          <div className="mt-2.5 px-3.5 py-2.5 rounded-xl bg-warn-soft/55 border border-warn/25 text-xs">
                            <span className="font-bold text-warn">{t.whatToAsk}: </span>
                            <span className="italic">“{question}”</span>
                          </div>
                        )}

                        <div className="mt-3.5 pt-3 border-t border-line flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="text-muted">
                            <strong className="text-ink">{t.sourceLabel}:</strong> {ev.page_ref || ev.document_version || "—"}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <ConfidenceRing confidence={line.confidence || 0.95} />
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setEvidenceDrawerLine(line)}
                              data-testid={`evidence-btn-${idx}`}
                            >
                              {t.whereFrom}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setChatDrawerLine(line);
                                askGroundedQuestion(line, "Why is this flagged and what should I ask the hospital?");
                              }}
                              data-testid={`ask-charge-btn-${idx}`}
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-saffron-ink" /> {t.askAboutCharge}
                            </Button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {/* 3. Proof this report hasn't been changed (QR + collapsible cryptographic hashes) */}
                {vLedger && (
                  <div
                    data-testid="tamper-ledger-card"
                    className="bg-card rounded-2xl p-5 shadow-paper border border-line flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ok">
                        <ShieldCheck className="w-4 h-4" /> {t.proofTitle}
                      </div>
                      <p className="text-xs text-muted leading-relaxed">{t.proofBody}</p>
                      <div className="flex flex-wrap items-center gap-4 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setLookupHash(vLedger.report_hash);
                            setActiveTab("hash_lookup");
                            fetch(`/api/verify/${vLedger.report_hash}`)
                              .then((r) => r.json())
                              .then((d) => setLookupResult(d));
                          }}
                          data-testid="verify-this-hash-link"
                          className="inline-flex items-center gap-1 text-xs font-bold text-saffron-ink underline min-h-[36px]"
                        >
                          <span>{t.proofOpen}</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>

                        <details className="text-xs text-muted">
                          <summary className="font-semibold hover:text-ink">{t.techDetails}</summary>
                          <div className="mt-2 p-3 rounded-xl bg-paper border border-line font-mono text-[11px] space-y-1 break-all">
                            <div>Report SHA-256: {vLedger.report_hash}</div>
                            <div>Previous link: {vLedger.prev_hash}</div>
                            <div>Merkle root ({vLedger.anchor_network}): {vLedger.merkle_root}</div>
                          </div>
                        </details>
                      </div>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-line shrink-0">
                      <QRCodeSVG
                        value={`${window.location.origin}/verify/${vLedger.report_hash}`}
                        size={88}
                        fgColor="#2B1166"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}
          </div>
        )}

        {activeTab === "rates" && (
          <RatesPage
            rates={ratesCatalog}
            search={rateSearch}
            setSearch={setRateSearch}
            scheme={rateSchemeFilter}
            setScheme={setRateSchemeFilter}
          />
        )}

        {activeTab === "estimator" && (
          <EstimatorPage
            term={estimatorTerm}
            setTerm={setEstimatorTerm}
            result={estimatorResult}
            cityTier={cityTier}
            setCityTier={setCityTier}
            nabhAccredited={nabhAccredited}
            setNabhAccredited={setNabhAccredited}
            wardType={wardType}
            setWardType={setWardType}
            stayDays={stayDays}
            setStayDays={setStayDays}
            onNavigateToCheckBill={() => setActiveTab("verify")}
          />
        )}

        {activeTab === "analytics" && <AnalyticsPage data={regulatorData} />}

        {activeTab === "history" && (
          <HistoryPage
            list={historyList}
            onOpenHash={(hash) => {
              setLookupHash(hash);
              setActiveTab("hash_lookup");
              fetch(`/api/verify/${encodeURIComponent(hash)}`)
                .then((r) => r.json())
                .then((d) => setLookupResult(d));
            }}
          />
        )}

        {activeTab === "hash_lookup" && (
          <VerifyHashPage
            hash={lookupHash}
            setHash={setLookupHash}
            result={lookupResult}
            onVerify={() => {
              fetch(`/api/verify/${encodeURIComponent(lookupHash)}`)
                .then((r) => r.json())
                .then((d) => setLookupResult(d));
            }}
          />
        )}

        {activeTab === "privacy" && (
          <PrivacyPage
            retentionDays={retentionDays}
            setRetentionDays={setRetentionDays}
            onDelete={async () => {
              const res = await fetch(`/api/privacy/session/${encodeURIComponent(sessionId)}`, {
                method: "DELETE",
              });
              const d = await res.json();
              setPrivacyStatusMsg(`Deleted ${d.deleted_bills_count} bill record(s) for session ${sessionId}.`);
              setHistoryList([]);
            }}
            statusMsg={privacyStatusMsg}
            t={t}
          />
        )}

        {activeTab === "storybook" && <StorybookPage />}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-line bg-card/50 mt-12 py-6 text-xs text-muted">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <strong className="text-ink">SwasthyaBillCheck (NMBTP)</strong> · Built by Team TechNova (VIT Bhopal University) for SBI Youth Ideathon 2026
          </div>
          <div>National Consumer Helpline: 1915 · PM-JAY: 14555 · NPPA Pharma Jan Samadhan: 1800-111-255</div>
        </div>
      </footer>

      {/* SHEETS & MODALS */}
      <EvidenceSheet
        line={evidenceDrawerLine}
        onClose={() => setEvidenceDrawerLine(null)}
        lang={lang}
        t={t}
        onCopy={copyText}
      />

      <AskChargeSheet
        line={chatDrawerLine}
        onClose={() => setChatDrawerLine(null)}
        question={chatQuestion}
        setQuestion={setChatQuestion}
        response={chatResponse}
        onAsk={askGroundedQuestion}
        t={t}
      />

      <DisputeLetterModal
        open={showDisputeModal}
        onClose={() => setShowDisputeModal(false)}
        disputePack={verificationData?.dispute_pack}
        lang={lang}
        t={t}
        onCopy={copyText}
      />

      <CameraModal
        open={cameraActive}
        videoRef={videoRef}
        onClose={() => setCameraActive(false)}
        onCapture={stopCameraAndUseFrame}
        t={t}
      />

      <ConsentModal
        open={showConsentModal}
        onAccept={() => setShowConsentModal(false)}
        onClose={() => setShowConsentModal(false)}
        t={t}
      />

      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}
