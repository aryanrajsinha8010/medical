export type SupportedLang =
  | "en"
  | "hi"
  | "bn"
  | "ta"
  | "te"
  | "mr"
  | "gu"
  | "kn"
  | "ml"
  | "pa"
  | "or"
  | "as";

/** Native names first: people recognise their own script faster than an English label. */
export const LANGUAGE_LABELS: Record<SupportedLang, string> = {
  en: "English",
  hi: "हिन्दी",
  bn: "বাংলা",
  ta: "தமிழ்",
  te: "తెలుగు",
  mr: "मराठी",
  gu: "ગુજરાતી",
  kn: "ಕನ್ನಡ",
  ml: "മലയാളം",
  pa: "ਪੰਜਾਬੀ",
  or: "ଓଡ଼ିଆ",
  as: "অসমীয়া",
};

/** BCP-47 speech synthesis locale codes for all 12 supported Indian languages. */
export const VOICE_LOCALES: Record<SupportedLang, string> = {
  en: "en-IN",
  hi: "hi-IN",
  bn: "bn-IN",
  ta: "ta-IN",
  te: "te-IN",
  mr: "mr-IN",
  gu: "gu-IN",
  kn: "kn-IN",
  ml: "ml-IN",
  pa: "pa-IN",
  or: "or-IN",
  as: "as-IN",
};

export interface UITranslations {
  appName: string;
  tagline: string;
  disclaimerBanner: string;
  disclaimerMore: string;
  sampleDataBadge: string;
  sampleDataTip: string;
  howWeHandleBill: string;

  navHome: string;
  navCheck: string;
  navRates: string;
  navEstimator: string;
  navHistory: string;
  navMore: string;
  navVerifyHash: string;
  navPrivacy: string;
  navAnalytics: string;
  navStorybook: string;

  // Landing page ("Home & Guide")
  landingBadge: string;
  landingTitleA: string;
  landingTitleEm: string;
  landingTitleB: string;
  landingBody: string;
  landingCtaCheck: string;
  landingCtaEstimate: string;
  landingCtaRates: string;
  demoLauncherEyebrow: string;
  demoLauncherTitle: string;
  demoLauncherSub: string;
  rightsTitle: string;
  rightsCards: { title: string; body: string }[];
  pathwaysEyebrow: string;
  pathwaysTitle: string;
  pathwaysSub: string;
  pathways: { id: "verify" | "estimator" | "rates" | "hash_lookup"; badge: string; title: string; desc: string; cta: string }[];

  // Check a bill hero & controls
  heroEyebrow: string;
  heroTitleA: string;
  heroTitleEm: string;
  heroTitleB: string;
  heroBody: string;
  uploadBill: string;
  uploadHint: string;
  cameraCapture: string;
  trySampleBill: string;
  chooseSamplePlaceholder: string;
  orClickRealBill: string;
  sampleResultLabel: string;
  yourResultLabel: string;
  howSteps: { title: string; body: string }[];
  backToHome: string;
  milestone1: string;
  milestone2: (count: number) => string;
  milestone3: string;
  milestone4Flagged: (count: number) => string;
  milestone4Ok: string;

  stepUpload: string;
  stepReview: string;
  stepReport: string;

  contextTitle: string;
  contextBody: string;
  cityLabel: string;
  cityTip: string;
  cityMetro: string;
  cityMid: string;
  citySmall: string;
  roomLabel: string;
  roomGeneral: string;
  roomShared: string;
  roomPrivate: string;
  nabhLabel: string;
  nabhTip: string;
  nabhYes: string;
  nabhNo: string;

  // Empty & scanning states
  noBillTitle: string;
  noBillBody: string;
  uploadMyBillBtn: string;
  tryWithSampleBtn: string;
  scanningTitle: string;
  scanningBadge: (step: number) => string;
  scanningSteps: { title: string; sub: string }[];
  uploadedCheckedPrefix: string;
  hideRowEditor: string;
  reviewEditRows: (count: number) => string;

  // OCR review
  reviewTitle: string;
  reviewBody: string;
  reviewConfirm: string;
  reviewAddItem: string;
  reviewItem: string;
  reviewQty: string;
  reviewPrice: string;
  reviewTotal: string;
  reviewAccuracy: string;
  reviewCheckThis: string;
  reviewRemove: string;
  fixReading: string;
  backToReport: string;

  // Bill Report & Summary
  billReport: string;
  aboveApprovedRateSummary: (count: number) => string;
  downloadReport: string;
  summarySentence: (total: number, ok: number, flagged: number, unsure: number) => string;
  execSummaryBadge: string;
  actionRecommended: (count: number) => string;
  allWithinRef: string;
  billedLabel: string;
  rateLabel: string;
  totalBilled: string;
  govtRate: string;
  potentialSavings: string;
  notEntitlement: string;
  asWrittenOnBill: string;
  importantFindingsTitle: string;
  whoActsNext: string;
  billingDeskQuery: string;
  noDisputeNeeded: string;
  legalContextLabel: string;
  legalContextBody: string;
  allLinesFairBody: string;
  lineBreakdownTitle: (count: number) => string;
  filterAll: (count: number) => string;
  filterFlagged: (count: number) => string;
  filterOk: (count: number) => string;

  aboveReferenceBadge: string;
  withinReferenceBadge: string;
  needsConfirmBadge: string;
  cannotVerifyBadge: string;

  billXrayToggle: string;
  billXrayShow: string;
  billXrayHide: string;
  billXrayHint: string;

  askAboutCharge: string;
  whereFrom: string;
  whatToAsk: string;
  sourceLabel: string;

  generateDisputeLetter: string;
  voiceReadout: string;
  whatsappShare: string;
  checkAnother: string;

  proofTitle: string;
  proofBody: string;
  proofOpen: string;
  techDetails: string;

  // Dialogs & modals
  copyQuestion: string;
  otherBenchmarks: string;
  schemeLabel: string;
  noticeLabel: string;
  whereInDocLabel: string;
  effectiveSinceLabel: string;
  checkedForLabel: string;
  officialPortalLabel: string;
  medicalCodesNote: string;
  askGroundedNote: string;
  askPlaceholder: string;
  askBtn: string;
  quickQuestions: string[];
  fromScheduleLabel: string;
  disputeEyebrow: string;
  copyLetter: string;
  printBtn: string;
  helplinesTitle: string;
  helplinesSub: string;
  callBtn: string;
  portalBtn: string;
  cameraTitle: string;
  cameraFrameHint: string;
  cameraUsePhoto: string;
  copiedToast: string;
  lowLitHigh: (count: number) => string;
  lowLitOk: string;

  consentTitle: string;
  consentBody: string;
  consentPoints: string[];
  acceptConsent: string;
  declineConsent: string;

  deleteMyData: string;
  deleteConfirm: string;
  deleteCancel: string;

  // Rates page
  ratesEyebrow: string;
  ratesTitle: string;
  ratesSub: string;
  ratesSearchPlaceholder: string;
  popularLookups: string;
  allSchemesLabel: string;
  tierAdjusterLabel: string;
  ratesColTreatment: string;
  ratesColScheme: string;
  ratesColCategory: string;
  ratesColOfficialRate: string;
  ratesColSource: string;
  officialSite: string;
  noRatesMatched: (q: string) => string;

  // Estimator page
  estEyebrow: string;
  estTitle: string;
  estSub: string;
  estAlreadyHaveBill: string;
  estFilterSpecialty: string;
  estPickProcedure: string;
  estCityTier: string;
  estWard: string;
  estQuality: string;
  estStay: string;
  estOfficialRef: string;
  estGovtBenchmark: string;
  estPrivateRange: string;
  estPrivateSub: string;
  estComponentsTitle: string;
  estComponentsSub: string;
  estPrimaryProc: string;
  estBedNursing: string;
  estSpecialistRounds: string;
  estTotalBenchmark: string;
  estIncludedInPkg: string;
  estMandatoryInc: string;
  estAllowedExtras: string;
  estChecklistTitle: string;
  estChecklistSub: string;
  estChecklistItems: { title: string; body: string }[];

  // Analytics, History, Verify Hash, Privacy
  analyticsEyebrow: string;
  analyticsTitle: string;
  analyticsSub: (k: number) => string;
  analyticsBadge: (n: number) => string;
  analyticsChartTitle: string;
  analyticsLeaderboardTitle: string;
  analyticsLeaderboardSub: string;
  analyticsClarityScore: string;

  historyEyebrow: string;
  historyTitle: string;
  historyEmptyTitle: string;
  historyEmptyBody: string;
  historyFlaggedDiff: (flagged: number, diff: string) => string;

  verifyEyebrow: string;
  verifyTitle: string;
  verifySub: string;
  verifyPlaceholder: string;
  verifyBtn: string;
  verifyValidMsg: string;
  verifyInvalidMsg: string;

  privacyEyebrow: string;
  privacyTitle: string;
  privacySub: string;
  privacyCard1Title: string;
  privacyCard1Body: string;
  privacyCard2Title: string;
  privacyCard2Body: string;
  privacyRetentionLabel: string;
  privacyRetentionHint: string;
  privacyDays1: string;
  privacyDays7: string;
  privacyDays30: string;

  // Voice summary & Footer
  voiceSummary: (billed: number, ref: number, flagged: number, savings: number) => string;
  footerTeam: string;
  footerHelplines: string;

  errorTitle: string;
  errorBody: string;
  retry: string;
  offline: string;
  readingBill: string;

  display: string;
  largerText: string;
  simpleMode: string;
  darkMode: string;
  close: string;
}
