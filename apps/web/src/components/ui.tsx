import React, { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";

/* ------------------------------------------------------------------ hooks */

export function useMediaQuery(query: string): boolean {
  const get = () => (typeof window !== "undefined" ? window.matchMedia(query).matches : false);
  const [matches, setMatches] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

export function useOnline(): boolean {
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);
  return online;
}

export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* private mode: preference just won't persist */
    }
  }, [key, value]);
  return [value, setValue] as const;
}

/* ------------------------------------------------------------------ format */

export const inr = (n: number | null | undefined) =>
  n === null || n === undefined || Number.isNaN(Number(n)) ? "—" : `₹${Math.round(Number(n)).toLocaleString("en-IN")}`;

/* ------------------------------------------------------------------ button */

type Variant = "primary" | "accent" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand text-[rgb(var(--on-brand))] hover:opacity-90 shadow-paper",
  // Dark ink on saffron: white-on-saffron fails AA contrast, this passes at ~6:1.
  accent: "bg-saffron text-[#1E1240] hover:brightness-105 shadow-paper",
  secondary: "bg-card text-ink border border-line hover:border-brand/40 hover:bg-brand-soft/60",
  ghost: "text-ink hover:bg-brand-soft/70",
  danger: "bg-flag text-white hover:opacity-90 dark:text-[#1E1240]",
};

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: "min-h-[40px] px-3 text-sm gap-1.5",
    md: "min-h-[48px] px-4 text-[0.95rem] gap-2",
    lg: "min-h-[56px] px-6 text-base gap-2.5",
  };
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex items-center justify-center rounded-xl font-semibold transition disabled:opacity-50 disabled:pointer-events-none ${VARIANTS[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}

export const buttonClass = (variant: Variant = "secondary", extra = "") =>
  `inline-flex items-center justify-center rounded-xl font-semibold transition min-h-[48px] px-4 gap-2 ${VARIANTS[variant]} ${extra}`;

/* ------------------------------------------------------------------ segmented choice */

export function Segmented<T extends string | boolean>({
  label,
  value,
  options,
  onChange,
  hint,
  testIdPrefix,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  hint?: React.ReactNode;
  testIdPrefix?: string;
}) {
  const id = useId();
  return (
    <div role="radiogroup" aria-labelledby={id} className="min-w-0">
      <div id={id} className="text-sm font-semibold text-muted mb-1.5 flex items-center gap-1.5">
        {label}
        {hint}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={String(o.value)}
              type="button"
              role="radio"
              aria-checked={active}
              data-testid={testIdPrefix ? `${testIdPrefix}-${String(o.value)}` : undefined}
              onClick={() => onChange(o.value)}
              className={`min-h-[44px] px-3.5 rounded-full text-sm font-semibold border transition ${
                active ? "bg-brand text-[rgb(var(--on-brand))] border-brand" : "bg-card border-line text-ink hover:border-brand/50"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ tap-friendly explainer (title="" doesn't work on phones) */

export function InfoTip({ text, label = "What does this mean?" }: { text: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  return (
    <span ref={ref} className="relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="w-6 h-6 rounded-full border border-line text-[0.7rem] font-bold text-muted hover:text-ink hover:border-brand/50 inline-flex items-center justify-center"
      >
        ?
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute z-40 left-1/2 -translate-x-1/2 top-8 w-64 p-3 rounded-xl bg-ink text-paper text-sm font-normal leading-snug shadow-lift"
        >
          {text}
        </span>
      )}
    </span>
  );
}

/** An abbreviation with a plain-language meaning: "CGHS" gets a tap/hover explanation. */
export function Term({ children, meaning }: { children: React.ReactNode; meaning: string }) {
  return (
    <abbr title={meaning} className="term no-underline" tabIndex={0}>
      {children}
    </abbr>
  );
}

export const SCHEME_MEANING: Record<string, string> = {
  CGHS: "Central Government Health Scheme: the rates the government pays private hospitals for its own employees.",
  "PM-JAY": "Ayushman Bharat PM-JAY: fixed package prices for whole treatments, including stay, medicines and tests.",
  NPPA: "National Pharmaceutical Pricing Authority: legal price caps on essential medicines, stents and knee implants.",
  PMBI: "Jan Aushadhi: government generic medicine prices.",
  MJPJAY: "Mahatma Jyotiba Phule Jan Arogya Yojana, Maharashtra's state health scheme.",
};

/* ------------------------------------------------------------------ dialogs */

export function Sheet({
  open,
  onClose,
  title,
  eyebrow,
  side = "right",
  children,
  footer,
  testId,
  closeTestId,
  closeLabel = "Close",
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  eyebrow?: React.ReactNode;
  side?: "right" | "center" | "bottom";
  children: React.ReactNode;
  footer?: React.ReactNode;
  testId?: string;
  closeTestId?: string;
  closeLabel?: string;
}) {
  const reduce = useReducedMotion();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    lastFocus.current = document.activeElement as HTMLElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panelRef.current) {
        const f = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    requestAnimationFrame(() => panelRef.current?.focus());
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
      lastFocus.current?.focus?.();
    };
  }, [open, onClose]);

  const layout = {
    right: "justify-end items-stretch",
    center: "justify-center items-center p-4",
    bottom: "justify-center items-end",
  }[side];
  const panel = {
    right: "w-full max-w-lg h-full rounded-l-2xl",
    center: "w-full max-w-2xl max-h-[90vh] rounded-2xl",
    bottom: "w-full max-h-[85vh] rounded-t-2xl pb-[env(safe-area-inset-bottom)]",
  }[side];
  const from = reduce
    ? { opacity: 0 }
    : side === "right"
    ? { x: 40, opacity: 0 }
    : side === "bottom"
    ? { y: 60, opacity: 0 }
    : { y: 16, opacity: 0, scale: 0.98 };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={`fixed inset-0 z-50 flex ${layout}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-[#120C22]/55 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            data-testid={testId}
            initial={from}
            animate={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            exit={from}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className={`relative bg-card text-ink shadow-lift flex flex-col outline-none ${panel}`}
          >
            <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-line">
              <div className="min-w-0">
                {eyebrow && <div className="text-xs font-semibold uppercase tracking-wider text-saffron-ink mb-1">{eyebrow}</div>}
                <h2 id={titleId} className="font-display text-xl leading-tight">
                  {title}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                data-testid={closeTestId}
                aria-label={closeLabel}
                className="shrink-0 w-11 h-11 -mr-2 rounded-full inline-flex items-center justify-center hover:bg-brand-soft"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
            {footer && <div className="px-6 py-4 border-t border-line">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ small visuals */

/** How sure we are about what we read. Shown as a ring rather than a percentage-only label. */
export function ConfidenceRing({ confidence, showLabel = true }: { confidence: number; showLabel?: boolean }) {
  const pct = Math.round(confidence * 100);
  const tone = pct >= 85 ? "rgb(var(--ok))" : pct >= 72 ? "rgb(var(--warn))" : "rgb(var(--flag))";
  const r = 9;
  const c = 2 * Math.PI * r;
  return (
    <span className="inline-flex items-center gap-1.5" title={`We're ${pct}% sure we read this correctly`}>
      <svg width="24" height="24" viewBox="0 0 24 24" className="-rotate-90" aria-hidden>
        <circle cx="12" cy="12" r={r} stroke="rgb(var(--line))" strokeWidth="3" fill="none" />
        <circle
          cx="12"
          cy="12"
          r={r}
          stroke={tone}
          strokeWidth="3"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
          strokeLinecap="round"
        />
      </svg>
      {showLabel && (
        <span className="text-xs font-semibold text-muted tnum">
          <span className="sr-only">Read accuracy </span>
          {pct}%
        </span>
      )}
    </span>
  );
}

export function CountUp({ value, duration = 900 }: { value: number; duration?: number }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);
  useEffect(() => {
    if (reduce) {
      setShown(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, reduce]);
  return <span className="tnum">{inr(shown)}</span>;
}

/** The mark: a folded receipt with a check, drawn so it still reads at 24px. */
export function Logo({ className = "w-9 h-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <rect width="40" height="40" rx="11" fill="rgb(var(--brand))" />
      <path
        d="M12 9h16v21l-2.7-1.8L22.6 30l-2.6-1.8L17.4 30l-2.7-1.8L12 30z"
        fill="rgb(var(--card))"
        opacity="0.96"
      />
      <path d="M15 14h10M15 17.5h6" stroke="rgb(var(--brand))" strokeWidth="1.6" strokeLinecap="round" opacity="0.45" />
      <path d="M15.5 22l2.6 2.6 5.6-5.8" stroke="#F58220" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Toast({ message, onDone }: { message: string | null; onDone: () => void }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  }, [message, onDone]);
  return (
    <div aria-live="polite" className="fixed z-[60] left-1/2 -translate-x-1/2 bottom-24 md:bottom-8 pointer-events-none">
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="px-4 py-2.5 rounded-full bg-ink text-paper text-sm font-semibold shadow-lift"
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

