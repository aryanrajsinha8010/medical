import React, { useState } from "react";
import {
  Camera,
  Check,
  Copy,
  ExternalLink,
  MessageSquare,
  PhoneCall,
  Printer,
  ShieldCheck,
  Volume2,
} from "lucide-react";
import { SupportedLang, UITranslations, explanationLang } from "../i18n/translations";
import { Button, SCHEME_MEANING, Sheet, Term, inr, useMediaQuery } from "./ui";

/* ------------------------------------------------------------------ 1. Evidence ("Where's this rate from?") */

export function EvidenceSheet({
  line,
  onClose,
  lang,
  t,
  onCopy,
}: {
  line: any | null;
  onClose: () => void;
  lang: SupportedLang;
  t: UITranslations;
  onCopy: (text: string) => void;
}) {
  const mobile = useMediaQuery("(max-width: 640px)");
  const ev = line?.evidence || {};
  const elang = explanationLang(lang);
  const question = line?.hospital_question_i18n?.[elang] || "";
  const alts: any[] = line?.alternative_comparators || [];

  return (
    <Sheet
      open={Boolean(line)}
      onClose={onClose}
      side={mobile ? "bottom" : "right"}
      eyebrow={ev.scheme ? `${ev.scheme} · ${ev.rate_code}` : undefined}
      title={t.whereFrom}
      testId="evidence-drawer"
      closeTestId="close-evidence-drawer"
      closeLabel={t.close}
    >
      {line && (
        <div className="space-y-5 text-sm">
          {/* Plain-language takeaway first */}
          <div className="p-4 rounded-xl bg-brand-soft/60 border border-line space-y-2">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-semibold">{lang === "hi" ? line.canonical_name_hi : line.canonical_name}</span>
              <span className="text-xs text-muted">
                {t.asWrittenOnBill}: "{line.raw_text}"
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <div className="text-xs text-muted">{t.totalBilled}</div>
                <div className="text-lg font-bold tnum">{inr(line.billed_total)}</div>
              </div>
              <div>
                <div className="text-xs text-muted">
                  {ev.scheme || "Govt"} {t.rateLabel.toLowerCase()}
                </div>
                <div className="text-lg font-bold text-ok tnum">{inr(line.reference_total)}</div>
              </div>
            </div>
            {line.plain_term_meaning_i18n?.[elang] && (
              <p className="text-xs text-muted pt-1 border-t border-line/80">{line.plain_term_meaning_i18n[elang]}</p>
            )}
          </div>

          {/* What to say at the counter */}
          {question && (
            <div className="p-4 rounded-xl bg-warn-soft/70 border border-warn/25 space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-warn">{t.whatToAsk}</div>
              <p className="font-medium leading-relaxed">“{question}”</p>
              <Button size="sm" variant="secondary" onClick={() => onCopy(question)}>
                <Copy className="w-3.5 h-3.5" /> Copy this question
              </Button>
            </div>
          )}

          {/* Other schemes if both exist (e.g. PM-JAY package alongside CGHS) */}
          {alts.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-muted">Other government benchmarks</div>
              {alts.map((a, i) => (
                <div key={i} className="p-3 rounded-xl border border-line flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">
                      <Term meaning={SCHEME_MEANING[a.scheme] || a.scheme}>{a.scheme}</Term> · {a.code}
                    </div>
                    <div className="text-xs text-muted">{a.page_ref}</div>
                  </div>
                  <div className="font-bold tnum">{inr(a.total_rate ?? a.unit_rate)}</div>
                </div>
              ))}
            </div>
          )}

          {/* Official citation */}
          <dl className="divide-y divide-line border-t border-b border-line">
            <Row label="Scheme">
              <Term meaning={SCHEME_MEANING[ev.scheme] || ev.scheme}>{ev.scheme}</Term> ({ev.authority || "Govt of India"})
            </Row>
            <Row label="Notice">{ev.document_version || "—"}</Row>
            <Row label="Where in document">{ev.page_ref || "—"}</Row>
            <Row label="In effect since">{ev.effective_from || "—"}</Row>
            <Row label="Checked for">
              Tier {ev.city_tier || "X"} · {ev.nabh_accredited ? "NABH" : "Non-NABH"} · {(ev.ward_type || "").replace("_", "-")}
            </Row>
            {ev.source_url && (
              <Row label="Official portal">
                <a
                  href={ev.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-saffron-ink underline"
                >
                  {ev.source_url.replace(/^https?:\/\//, "")}
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </Row>
            )}
          </dl>

          <details className="text-xs text-muted">
            <summary className="font-semibold hover:text-ink py-1">Medical codes & licence note</summary>
            <div className="pt-2 space-y-1 font-mono">
              <div>Canonical ID: {ev.terminology?.canonical_id || "—"}</div>
              <div>
                ICD-10: {ev.terminology?.icd10 || "—"} · LOINC: {ev.terminology?.loinc || "—"} · ATC: {ev.terminology?.atc || "—"}
              </div>
              <div>Retrieved: {ev.retrieval_date || "—"}</div>
              <div className="font-sans">{ev.licence_note}</div>
            </div>
          </details>
        </div>
      )}
    </Sheet>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-2.5 flex items-baseline justify-between gap-4">
      <dt className="text-muted shrink-0">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}

/* ------------------------------------------------------------------ 2. Grounded "Ask about this" chat */

const QUICK_QUESTIONS = [
  "Does the hospital have to charge the government rate?",
  "Is there a cheaper generic or Jan Aushadhi option?",
  "Which circular can I show at the billing desk?",
];

export function AskChargeSheet({
  line,
  onClose,
  question,
  setQuestion,
  response,
  onAsk,
  t,
}: {
  line: any | null;
  onClose: () => void;
  question: string;
  setQuestion: (q: string) => void;
  response: any;
  onAsk: (line: any, q?: string) => void;
  t: UITranslations;
}) {
  const mobile = useMediaQuery("(max-width: 640px)");
  return (
    <Sheet
      open={Boolean(line)}
      onClose={onClose}
      side={mobile ? "bottom" : "right"}
      eyebrow={line?.raw_text}
      title={t.askAboutCharge}
      testId="grounded-chat-drawer"
      closeTestId="close-chat-drawer"
      closeLabel={t.close}
      footer={
        line && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onAsk(line);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask anything about this charge…"
              className="flex-1 min-h-[48px] rounded-xl border border-line bg-paper px-3.5 text-sm"
            />
            <Button type="submit" variant="accent">
              Ask
            </Button>
          </form>
        )
      }
    >
      {line && (
        <div className="space-y-4 text-sm">
          <p className="text-xs text-muted">
            Answers come only from the government rate notice and medical code for this item. We don't guess or invent policies.
          </p>

          <div className="flex flex-wrap gap-2">
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => {
                  setQuestion(q);
                  onAsk(line, q);
                }}
                className="text-left text-xs font-semibold px-3 py-2 rounded-xl bg-brand-soft/70 hover:bg-brand-soft transition"
              >
                {q}
              </button>
            ))}
          </div>

          {response ? (
            <div className="p-4 rounded-2xl bg-paper border border-line space-y-2 leading-relaxed whitespace-pre-line">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                <MessageSquare className="w-3.5 h-3.5 text-saffron-ink" />
                From the {line.evidence?.scheme || "official"} rate schedule
              </div>
              <div>{response.answer}</div>
            </div>
          ) : (
            <div className="skeleton h-28" />
          )}
        </div>
      )}
    </Sheet>
  );
}

/* ------------------------------------------------------------------ 3. Polite letter + helplines */

export function DisputeLetterModal({
  open,
  onClose,
  disputePack,
  lang,
  t,
  onCopy,
}: {
  open: boolean;
  onClose: () => void;
  disputePack: any;
  lang: SupportedLang;
  t: UITranslations;
  onCopy: (text: string) => void;
}) {
  const [letterLang, setLetterLang] = useState<"en" | "hi">(lang === "hi" ? "hi" : "en");
  const letter = (letterLang === "hi" ? disputePack?.letter_hi : disputePack?.letter_en) || "";
  const routes: any[] = disputePack?.verified_grievance_routes || [];

  return (
    <Sheet
      open={open && Boolean(disputePack)}
      onClose={onClose}
      side="center"
      eyebrow="Calm, polite, cites the exact circular"
      title={t.generateDisputeLetter}
      testId="dispute-letter-modal"
      closeTestId="close-dispute-modal"
      closeLabel={t.close}
    >
      {disputePack && (
        <div className="space-y-5 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex rounded-xl border border-line p-1 bg-paper">
              <button
                type="button"
                onClick={() => setLetterLang("en")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${letterLang === "en" ? "bg-brand text-[rgb(var(--on-brand))]" : ""}`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLetterLang("hi")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${letterLang === "hi" ? "bg-brand text-[rgb(var(--on-brand))]" : ""}`}
              >
                हिन्दी
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="primary" onClick={() => onCopy(letter)}>
                <Copy className="w-3.5 h-3.5" /> Copy letter
              </Button>
              <Button size="sm" variant="secondary" onClick={() => window.print()}>
                <Printer className="w-3.5 h-3.5" /> Print
              </Button>
            </div>
          </div>

          <pre className="p-4 rounded-xl bg-paper border border-line text-xs sm:text-sm whitespace-pre-wrap font-sans leading-relaxed max-h-72 overflow-y-auto">
            {letter}
          </pre>

          <div className="space-y-2.5">
            <h3 className="font-display text-base">If the hospital doesn't help, who can you call?</h3>
            <p className="text-xs text-muted">
              Start with the hospital's billing desk or grievance officer. If you hit a wall, these are official government helplines:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {routes.map((g) => (
                <div key={g.route_id} className="p-3.5 rounded-xl border border-line bg-paper flex flex-col justify-between gap-2">
                  <div>
                    <div className="font-semibold leading-snug">{g.authority_name}</div>
                    <div className="text-xs text-muted mt-0.5">{g.legal_basis}</div>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <a
                      href={`tel:${String(g.toll_free).replace(/[^0-9+]/g, "")}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ok-soft text-ok font-bold text-xs"
                    >
                      <PhoneCall className="w-3.5 h-3.5" /> Call {g.toll_free}
                    </a>
                    {g.portal_url && (
                      <a
                        href={g.portal_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-saffron-ink underline inline-flex items-center gap-1"
                      >
                        Portal <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Sheet>
  );
}

/* ------------------------------------------------------------------ 4. Camera capture */

export function CameraModal({
  open,
  videoRef,
  onClose,
  onCapture,
  t,
}: {
  open: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onClose: () => void;
  onCapture: () => void;
  t: UITranslations;
}) {
  return (
    <Sheet open={open} onClose={onClose} side="center" title="Hold the bill flat in good light" closeLabel={t.close}>
      <div className="space-y-4">
        <div className="relative rounded-2xl overflow-hidden bg-[#120C22] aspect-[3/4] max-h-[60vh] mx-auto">
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
          <div className="absolute inset-5 border-2 border-dashed border-saffron/90 rounded-xl pointer-events-none">
            <span className="absolute -top-3 left-3 bg-saffron text-[#1E1240] text-xs font-bold px-2.5 py-0.5 rounded-full">
              Fit all four corners inside the frame
            </span>
            <div className="scan-line" />
          </div>
        </div>
        <Button variant="accent" size="lg" className="w-full" data-testid="capture-frame-confirm-btn" onClick={onCapture}>
          <Camera className="w-5 h-5" /> Use this photo
        </Button>
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ 5. DPDP consent before first upload */

export function ConsentModal({
  open,
  onAccept,
  onClose,
  t,
}: {
  open: boolean;
  onAccept: () => void;
  onClose: () => void;
  t: UITranslations;
}) {
  return (
    <Sheet open={open} onClose={onClose} side="center" eyebrow="DPDP Act 2023" title={t.consentTitle} closeLabel={t.close}>
      <div className="space-y-4 text-sm">
        <p className="text-muted">{t.consentBody}</p>
        <ul className="space-y-2.5">
          {t.consentPoints.map((p, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="mt-0.5 w-5 h-5 rounded-full bg-ok-soft text-ok inline-flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5" />
              </span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
        <div className="p-3 rounded-xl bg-brand-soft/60 text-xs text-muted">
          <strong className="text-ink">{t.disclaimerBanner}</strong> {t.disclaimerMore}
        </div>
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            {t.declineConsent}
          </Button>
          <Button variant="primary" onClick={onAccept} data-testid="accept-consent-btn">
            <ShieldCheck className="w-4 h-4" /> {t.acceptConsent}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ 6. Voice readout pill for low-literacy mode */

export function LowLiteracyBar({
  summary,
  onSpeak,
  onDispute,
  onWhatsApp,
  t,
}: {
  summary: any;
  onSpeak: () => void;
  onDispute: () => void;
  onWhatsApp: () => void;
  t: UITranslations;
}) {
  if (!summary) return null;
  const flagged = summary.flagged_count > 0;
  return (
    <div className="p-4 rounded-2xl bg-brand text-[rgb(var(--on-brand))] flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="text-3xl" aria-hidden>
          {flagged ? "⚠️" : "✅"}
        </span>
        <div>
          <div className="font-display text-lg">
            {flagged ? `${summary.flagged_count} charge looks high` : "Every charge matches government rates"}
          </div>
          <div className="text-sm opacity-85">
            Billed {inr(summary.billed_total)} · Government rate {inr(summary.reference_total)}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="accent" onClick={onSpeak}>
          <Volume2 className="w-5 h-5" /> {t.voiceReadout}
        </Button>
        <Button variant="secondary" onClick={onDispute}>
          ✉️ {t.generateDisputeLetter}
        </Button>
        <Button variant="secondary" onClick={onWhatsApp}>
          💬 WhatsApp
        </Button>
      </div>
    </div>
  );
}

