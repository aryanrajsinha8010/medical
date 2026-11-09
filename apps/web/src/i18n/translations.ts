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

export interface UITranslations {
  appName: string;
  tagline: string;
  disclaimerBanner: string;
  disclaimerMore: string;
  sampleDataBadge: string;
  sampleDataTip: string;

  navCheck: string;
  navRates: string;
  navEstimator: string;
  navHistory: string;
  navMore: string;
  navVerifyHash: string;
  navPrivacy: string;
  navAnalytics: string;
  navStorybook: string;

  heroEyebrow: string;
  heroTitleA: string;
  heroTitleEm: string;
  heroTitleB: string;
  heroBody: string;
  uploadBill: string;
  uploadHint: string;
  cameraCapture: string;
  trySampleBill: string;
  sampleResultLabel: string;
  yourResultLabel: string;
  howSteps: { title: string; body: string }[];

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

  reviewTitle: string;
  reviewBody: string;
  reviewConfirm: string;
  reviewAddItem: string;
  reviewItem: string;
  reviewQty: string;
  reviewPrice: string;
  reviewTotal: string;
  reviewCheckThis: string;
  reviewRemove: string;
  fixReading: string;
  backToReport: string;

  billReport: string;
  aboveApprovedRateSummary: (count: number) => string;
  downloadReport: string;
  summarySentence: (total: number, ok: number, flagged: number, unsure: number) => string;
  billedLabel: string;
  rateLabel: string;
  totalBilled: string;
  govtRate: string;
  potentialSavings: string;
  notEntitlement: string;
  asWrittenOnBill: string;

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

  consentTitle: string;
  consentBody: string;
  consentPoints: string[];
  acceptConsent: string;
  declineConsent: string;

  deleteMyData: string;
  deleteConfirm: string;
  deleteCancel: string;

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

const EN: UITranslations = {
  appName: "SwasthyaBillCheck",
  tagline: "Ideas today, impact tomorrow.",
  disclaimerBanner: "Informational tool, not legal or medical advice.",
  disclaimerMore:
    "Private hospitals don't have to charge government rates. The exceptions are NPPA price caps on stents, knee implants and essential medicines, which apply everywhere.",
  sampleDataBadge: "Includes sample reference data",
  sampleDataTip:
    "Most rates come straight from government notices. A few are curated reference values while we load full state lists. Every rate shows exactly where it came from.",

  navCheck: "Check a bill",
  navRates: "Look up rates",
  navEstimator: "Plan a treatment",
  navHistory: "My reports",
  navMore: "More",
  navVerifyHash: "Is a report genuine?",
  navPrivacy: "Privacy & my data",
  navAnalytics: "For policymakers",
  navStorybook: "Design system",

  heroEyebrow: "Free · Private · 12 Indian languages",
  heroTitleA: "Is your hospital bill ",
  heroTitleEm: "fair",
  heroTitleB: "? Find out in a minute.",
  heroBody:
    "Take a photo of your bill. We'll read every line and put it next to the rate the government itself pays, so you know what to ask at the billing desk.",
  uploadBill: "Upload your bill",
  uploadHint: "Photo or PDF, up to 12 MB",
  cameraCapture: "Take a photo",
  trySampleBill: "Or try a sample bill",
  sampleResultLabel: "Sample result",
  yourResultLabel: "Your result",
  howSteps: [
    { title: "Add your bill", body: "A clear photo works. We hide your name, phone and Aadhaar first." },
    { title: "We compare each line", body: "Against CGHS, PM-JAY, NPPA and Jan Aushadhi rates." },
    { title: "You get a plain report", body: "What looks high, why, and the exact question to ask." },
  ],

  stepUpload: "Add bill",
  stepReview: "Check details",
  stepReport: "Your report",

  contextTitle: "About the hospital",
  contextBody: "Government rates depend on these three things. Change any of them and we'll re-check straight away.",
  cityLabel: "City size",
  cityTip: "CGHS groups cities into tiers. Rates in smaller cities are 10 to 20% lower.",
  cityMetro: "Metro",
  cityMid: "Mid-size city",
  citySmall: "Small town",
  roomLabel: "Room type",
  roomGeneral: "General ward",
  roomShared: "Shared room",
  roomPrivate: "Private room",
  nabhLabel: "NABH accredited?",
  nabhTip: "NABH is India's hospital quality certificate. Accredited hospitals get roughly 15% higher government rates. It's usually printed on the bill or the hospital's website.",
  nabhYes: "Yes",
  nabhNo: "No / not sure",

  reviewTitle: "Did we read your bill right?",
  reviewBody: "Fix anything that looks off. Lines marked in amber were hard to read, so please give those a quick look.",
  reviewConfirm: "Looks right, check my bill",
  reviewAddItem: "Add a missing item",
  reviewItem: "Item",
  reviewQty: "Qty",
  reviewPrice: "Price each (₹)",
  reviewTotal: "Total",
  reviewCheckThis: "Please check this one",
  reviewRemove: "Remove",
  fixReading: "Fix what we read",
  backToReport: "Back to my report",

  billReport: "Bill report",
  aboveApprovedRateSummary: (c) => (c === 0 ? "Every item is within approved rates" : `${c} ${c === 1 ? "item" : "items"} above approved rate`),
  downloadReport: "Download report",
  summarySentence: (total, ok, flagged, unsure) => {
    const parts = [`We checked ${total} ${total === 1 ? "item" : "items"}.`];
    if (ok) parts.push(`${ok} ${ok === 1 ? "matches" : "match"} government rates.`);
    if (flagged) parts.push(`${flagged} ${flagged === 1 ? "is" : "are"} higher than the reference rate. Worth asking about.`);
    if (unsure) parts.push(`${unsure} we couldn't match with confidence.`);
    return parts.join(" ");
  },
  billedLabel: "Bill",
  rateLabel: "Rate",
  totalBilled: "You were billed",
  govtRate: "Government rate",
  potentialSavings: "Worth asking about",
  notEntitlement: "A starting point for a conversation, not a refund you're owed.",
  asWrittenOnBill: "On your bill",

  aboveReferenceBadge: "Above government reference rate",
  withinReferenceBadge: "Matches government rate",
  needsConfirmBadge: "Please confirm",
  cannotVerifyBadge: "No matching rate",

  billXrayToggle: "See it on your bill",
  billXrayShow: "Show on my bill",
  billXrayHide: "Hide",
  billXrayHint: "Tap a highlighted line to see why.",

  askAboutCharge: "Ask about this",
  whereFrom: "Where's this rate from?",
  whatToAsk: "What to ask the billing desk",
  sourceLabel: "Source",

  generateDisputeLetter: "Write to the hospital",
  voiceReadout: "Read it to me",
  whatsappShare: "Send on WhatsApp",
  checkAnother: "Check another bill",

  proofTitle: "Proof this report hasn't been changed",
  proofBody: "Anyone, including the hospital, can scan this code to confirm the report is exactly as we produced it.",
  proofOpen: "Open the public check page",
  techDetails: "Technical details",

  consentTitle: "Before you upload",
  consentBody: "Here's exactly what happens to your bill, in plain words.",
  consentPoints: [
    "We remove your name, phone number, Aadhaar and UHID before anything is saved.",
    "The photo itself is deleted automatically after 7 days. You can change this.",
    "We never sell your data. Only anonymous totals from 10 or more bills are ever shared.",
    "You can delete everything with one tap, any time.",
  ],
  acceptConsent: "Okay, continue",
  declineConsent: "Not now",

  deleteMyData: "Delete everything I've uploaded",
  deleteConfirm: "Yes, delete it all",
  deleteCancel: "Keep my reports",

  errorTitle: "We couldn't reach the checking service",
  errorBody: "Your bill hasn't been sent anywhere. Check your connection and try again.",
  retry: "Try again",
  offline: "You're offline. You can still look at reports you've already opened.",
  readingBill: "Reading your bill…",

  display: "Display",
  largerText: "Larger text",
  simpleMode: "Simple mode (icons + voice)",
  darkMode: "Dark mode",
  close: "Close",
};

const HI: UITranslations = {
  ...EN,
  appName: "स्वास्थ्य बिल चेक",
  tagline: "आज के विचार, कल का असर।",
  disclaimerBanner: "सूचनात्मक उपकरण, कानूनी या चिकित्सा सलाह नहीं।",
  disclaimerMore:
    "निजी अस्पताल सरकारी दरें लेने के लिए बाध्य नहीं हैं। अपवाद: स्टेंट, घुटना इम्प्लांट और आवश्यक दवाओं पर NPPA की अधिकतम कीमत, जो हर जगह लागू है।",
  sampleDataBadge: "कुछ नमूना संदर्भ दरें शामिल",
  sampleDataTip: "ज़्यादातर दरें सीधे सरकारी अधिसूचनाओं से हैं। हर दर के साथ उसका स्रोत दिखाया गया है।",

  navCheck: "बिल जांचें",
  navRates: "सरकारी दरें देखें",
  navEstimator: "इलाज का खर्च",
  navHistory: "मेरी रिपोर्ट",
  navMore: "और",
  navVerifyHash: "रिपोर्ट असली है?",
  navPrivacy: "गोपनीयता और मेरा डेटा",
  navAnalytics: "नीति-निर्माताओं के लिए",
  navStorybook: "डिज़ाइन सिस्टम",

  heroEyebrow: "मुफ़्त · निजी · 12 भारतीय भाषाएं",
  heroTitleA: "क्या आपका अस्पताल बिल ",
  heroTitleEm: "सही",
  heroTitleB: " है? एक मिनट में जानें।",
  heroBody:
    "बिल की फ़ोटो लें। हम हर लाइन पढ़कर उसे उस दर के साथ रखेंगे जो सरकार खुद चुकाती है, ताकि आपको पता हो कि बिलिंग डेस्क पर क्या पूछना है।",
  uploadBill: "अपना बिल अपलोड करें",
  uploadHint: "फ़ोटो या PDF, 12 MB तक",
  cameraCapture: "फ़ोटो लें",
  trySampleBill: "या एक नमूना बिल आज़माएं",
  sampleResultLabel: "नमूना परिणाम",
  yourResultLabel: "आपका परिणाम",
  howSteps: [
    { title: "बिल जोड़ें", body: "साफ़ फ़ोटो काफ़ी है। हम पहले आपका नाम, फ़ोन और आधार छिपा देते हैं।" },
    { title: "हर लाइन की तुलना", body: "CGHS, PM-JAY, NPPA और जन औषधि दरों से।" },
    { title: "आसान रिपोर्ट", body: "क्या ज़्यादा लगता है, क्यों, और क्या पूछना है।" },
  ],

  stepUpload: "बिल जोड़ें",
  stepReview: "जांच लें",
  stepReport: "आपकी रिपोर्ट",

  contextTitle: "अस्पताल के बारे में",
  contextBody: "सरकारी दरें इन तीन बातों पर निर्भर करती हैं। कुछ भी बदलें, हम तुरंत दोबारा जांचेंगे।",
  cityLabel: "शहर",
  cityTip: "CGHS शहरों को श्रेणियों में बांटता है। छोटे शहरों में दरें 10 से 20% कम होती हैं।",
  cityMetro: "महानगर",
  cityMid: "मध्यम शहर",
  citySmall: "छोटा शहर",
  roomLabel: "कमरा",
  roomGeneral: "जनरल वार्ड",
  roomShared: "शेयर्ड कमरा",
  roomPrivate: "प्राइवेट कमरा",
  nabhLabel: "NABH मान्यता?",
  nabhTip: "NABH भारत का अस्पताल गुणवत्ता प्रमाणपत्र है। मान्यता प्राप्त अस्पतालों की सरकारी दर लगभग 15% ज़्यादा होती है।",
  nabhYes: "हां",
  nabhNo: "नहीं / पता नहीं",

  reviewTitle: "क्या हमने बिल सही पढ़ा?",
  reviewBody: "जो गलत लगे उसे ठीक करें। पीले रंग वाली लाइनें पढ़ने में मुश्किल थीं, उन्हें ज़रूर देखें।",
  reviewConfirm: "सही है, बिल जांचें",
  reviewAddItem: "छूटी हुई चीज़ जोड़ें",
  reviewItem: "मद",
  reviewQty: "संख्या",
  reviewPrice: "एक का दाम (₹)",
  reviewTotal: "कुल",
  reviewCheckThis: "कृपया इसे देखें",
  reviewRemove: "हटाएं",
  fixReading: "पढ़ाई ठीक करें",
  backToReport: "रिपोर्ट पर वापस",

  billReport: "बिल रिपोर्ट",
  aboveApprovedRateSummary: (c) => (c === 0 ? "सभी मद सरकारी दर के अंदर हैं" : `${c} मद सरकारी दर से ज़्यादा`),
  downloadReport: "रिपोर्ट डाउनलोड करें",
  summarySentence: (total, ok, flagged, unsure) => {
    const parts = [`हमने ${total} मद जांचे।`];
    if (ok) parts.push(`${ok} सरकारी दर से मेल खाते हैं।`);
    if (flagged) parts.push(`${flagged} संदर्भ दर से ज़्यादा हैं, इनके बारे में पूछना ठीक रहेगा।`);
    if (unsure) parts.push(`${unsure} का पक्का मिलान नहीं हो सका।`);
    return parts.join(" ");
  },
  billedLabel: "बिल",
  rateLabel: "दर",
  totalBilled: "आपका बिल",
  govtRate: "सरकारी दर",
  potentialSavings: "पूछने लायक अंतर",
  notEntitlement: "यह बातचीत की शुरुआत है, कोई तय रिफ़ंड नहीं।",
  asWrittenOnBill: "बिल पर",

  aboveReferenceBadge: "सरकारी संदर्भ दर से ज़्यादा",
  withinReferenceBadge: "सरकारी दर के अनुसार",
  needsConfirmBadge: "कृपया पुष्टि करें",
  cannotVerifyBadge: "मिलती दर नहीं मिली",

  billXrayToggle: "बिल पर देखें",
  billXrayShow: "मेरे बिल पर दिखाएं",
  billXrayHide: "छिपाएं",
  billXrayHint: "कारण जानने के लिए रंगी हुई लाइन पर टैप करें।",

  askAboutCharge: "इसके बारे में पूछें",
  whereFrom: "यह दर कहां से है?",
  whatToAsk: "बिलिंग डेस्क पर क्या पूछें",
  sourceLabel: "स्रोत",

  generateDisputeLetter: "अस्पताल को पत्र लिखें",
  voiceReadout: "सुनाइए",
  whatsappShare: "व्हाट्सएप पर भेजें",
  checkAnother: "दूसरा बिल जांचें",

  proofTitle: "इस रिपोर्ट में बदलाव नहीं हुआ है, इसका सबूत",
  proofBody: "कोई भी, अस्पताल भी, यह कोड स्कैन करके पुष्टि कर सकता है कि रिपोर्ट वैसी ही है।",
  proofOpen: "सार्वजनिक जांच पेज खोलें",
  techDetails: "तकनीकी जानकारी",

  consentTitle: "अपलोड करने से पहले",
  consentBody: "आपके बिल के साथ क्या होता है, सीधे शब्दों में।",
  consentPoints: [
    "कुछ भी सेव करने से पहले हम आपका नाम, फ़ोन, आधार और UHID हटा देते हैं।",
    "फ़ोटो 7 दिन बाद अपने-आप मिट जाती है। आप इसे बदल सकते हैं।",
    "हम आपका डेटा कभी नहीं बेचते।",
    "आप एक टैप में सब कुछ कभी भी मिटा सकते हैं।",
  ],
  acceptConsent: "ठीक है, आगे बढ़ें",
  declineConsent: "अभी नहीं",

  deleteMyData: "मेरा अपलोड किया सब कुछ मिटाएं",
  deleteConfirm: "हां, सब मिटा दें",
  deleteCancel: "रहने दें",

  errorTitle: "जांच सेवा से संपर्क नहीं हो पाया",
  errorBody: "आपका बिल कहीं नहीं भेजा गया। कनेक्शन देखकर फिर कोशिश करें।",
  retry: "फिर कोशिश करें",
  offline: "आप ऑफ़लाइन हैं। पहले खोली गई रिपोर्ट अब भी देख सकते हैं।",
  readingBill: "आपका बिल पढ़ा जा रहा है…",

  display: "डिस्प्ले",
  largerText: "बड़े अक्षर",
  simpleMode: "आसान मोड (चित्र + आवाज़)",
  darkMode: "डार्क मोड",
  close: "बंद करें",
};

/** Partial translations: anything missing falls back to Hindi (Devanagari scripts) or English. */
const PARTIALS: Partial<Record<SupportedLang, { base: UITranslations; strings: Partial<UITranslations> }>> = {
  mr: {
    base: HI,
    strings: {
      appName: "आरोग्य बिल तपासणी",
      navCheck: "बिल तपासा",
      uploadBill: "तुमचे बिल अपलोड करा",
      cameraCapture: "फोटो काढा",
      downloadReport: "अहवाल डाउनलोड करा",
      heroTitleA: "तुमचे रुग्णालय बिल ",
      heroTitleEm: "योग्य",
      heroTitleB: " आहे का? एका मिनिटात जाणून घ्या.",
    },
  },
  bn: {
    base: EN,
    strings: {
      appName: "স্বাস্থ্য বিল চেক",
      navCheck: "বিল যাচাই",
      uploadBill: "আপনার বিল আপলোড করুন",
      cameraCapture: "ছবি তুলুন",
      downloadReport: "রিপোর্ট ডাউনলোড করুন",
      heroTitleA: "আপনার হাসপাতালের বিল কি ",
      heroTitleEm: "ন্যায্য",
      heroTitleB: "? এক মিনিটে জানুন।",
    },
  },
  ta: {
    base: EN,
    strings: {
      appName: "மருத்துவ பில் சரிபார்ப்பு",
      navCheck: "பில் சரிபார்",
      uploadBill: "உங்கள் பில்லை பதிவேற்றவும்",
      cameraCapture: "புகைப்படம் எடுக்கவும்",
      downloadReport: "அறிக்கையைப் பதிவிறக்கவும்",
    },
  },
  te: {
    base: EN,
    strings: {
      appName: "వైద్య బిల్లు తనిఖీ",
      navCheck: "బిల్లు తనిఖీ",
      uploadBill: "మీ బిల్లును అప్‌లోడ్ చేయండి",
      cameraCapture: "ఫోటో తీయండి",
    },
  },
  gu: {
    base: EN,
    strings: {
      appName: "સ્વાસ્થ્ય બિલ ચેક",
      navCheck: "બિલ તપાસો",
      uploadBill: "તમારું બિલ અપલોડ કરો",
      cameraCapture: "ફોટો લો",
    },
  },
  kn: {
    base: EN,
    strings: {
      appName: "ಆರೋಗ್ಯ ಬಿಲ್ ಪರಿಶೀಲನೆ",
      navCheck: "ಬಿಲ್ ಪರಿಶೀಲಿಸಿ",
      uploadBill: "ನಿಮ್ಮ ಬಿಲ್ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ",
      cameraCapture: "ಫೋಟೋ ತೆಗೆಯಿರಿ",
    },
  },
  ml: {
    base: EN,
    strings: {
      appName: "ആശുപത്രി ബിൽ പരിശോധന",
      navCheck: "ബിൽ പരിശോധിക്കുക",
      uploadBill: "നിങ്ങളുടെ ബിൽ അപ്‌ലോഡ് ചെയ്യുക",
      cameraCapture: "ഫോട്ടോ എടുക്കുക",
    },
  },
  pa: {
    base: EN,
    strings: {
      appName: "ਸਿਹਤ ਬਿੱਲ ਜਾਂਚ",
      navCheck: "ਬਿੱਲ ਜਾਂਚੋ",
      uploadBill: "ਆਪਣਾ ਬਿੱਲ ਅੱਪਲੋਡ ਕਰੋ",
      cameraCapture: "ਫੋਟੋ ਲਓ",
    },
  },
  or: {
    base: EN,
    strings: {
      appName: "ସ୍ୱାସ୍ଥ୍ୟ ବିଲ୍ ଯାଞ୍ଚ",
      navCheck: "ବିଲ୍ ଯାଞ୍ଚ",
      uploadBill: "ଆପଣଙ୍କ ବିଲ୍ ଅପଲୋଡ୍ କରନ୍ତୁ",
    },
  },
  as: {
    base: EN,
    strings: {
      appName: "স্বাস্থ্য বিল পৰীক্ষা",
      navCheck: "বিল পৰীক্ষা",
      uploadBill: "আপোনাৰ বিল আপলোড কৰক",
    },
  },
};

export function getTranslations(lang: SupportedLang): UITranslations {
  if (lang === "en") return EN;
  if (lang === "hi") return HI;
  const partial = PARTIALS[lang];
  return partial ? { ...partial.base, ...partial.strings } : EN;
}

/** Which language the server-side explanations are available in. Only en/hi today. */
export function explanationLang(lang: SupportedLang): "en" | "hi" {
  return lang === "hi" || lang === "mr" ? "hi" : "en";
}
