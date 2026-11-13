import type {
  CallOutcome,
  CallPurpose,
  DeliveryType,
  EntryKind,
  Level,
  Source,
  Subject,
  TicketState,
} from '@/api/schemas';

export type Lang = 'en' | 'kn';
type Bilingual = { en: string; kn: string };

/** Plain-language labels for every fact code in docs/contracts.md §1. */
const FACT_LABELS: Record<string, Bilingual> = {
  // Mother
  bleeding_heavy: { en: 'Heavy bleeding', kn: 'ಹೆಚ್ಚು ರಕ್ತಸ್ರಾವ' },
  pads_soaked_count: { en: 'Pads soaked since morning', kn: 'ಬೆಳಗಿನಿಂದ ನೆನೆದ ಬಟ್ಟೆಗಳು' },
  pad_soaked_within_hour: { en: 'Pad soaked within an hour', kn: 'ಒಂದು ಗಂಟೆಯೊಳಗೆ ಬಟ್ಟೆ ನೆನೆದಿದೆ' },
  clots_large: { en: 'Large blood clots', kn: 'ದೊಡ್ಡ ರಕ್ತ ಹೆಪ್ಪುಗಳು' },
  headache_severe: { en: 'Severe headache', kn: 'ತೀವ್ರ ತಲೆನೋವು' },
  vision_blurred: { en: 'Blurred vision', kn: 'ಮಸುಕಾದ ದೃಷ್ಟಿ' },
  swelling_face_hands: { en: 'Swelling of face or hands', kn: 'ಮುಖ ಅಥವಾ ಕೈ ಊತ' },
  bp_systolic: { en: 'Blood pressure (upper)', kn: 'ರಕ್ತದೊತ್ತಡ (ಮೇಲಿನ)' },
  bp_diastolic: { en: 'Blood pressure (lower)', kn: 'ರಕ್ತದೊತ್ತಡ (ಕೆಳಗಿನ)' },
  fever: { en: 'Fever', kn: 'ಜ್ವರ' },
  discharge_foul: { en: 'Foul-smelling discharge', kn: 'ದುರ್ವಾಸನೆಯ ಸ್ರಾವ' },
  abdominal_pain_severe: { en: 'Severe stomach pain', kn: 'ತೀವ್ರ ಹೊಟ್ಟೆನೋವು' },
  wound_red_or_oozing: { en: 'Stitches red or oozing', kn: 'ಹೊಲಿಗೆ ಕೆಂಪಾಗಿದೆ ಅಥವಾ ಸೋರುತ್ತಿದೆ' },
  breast_red_painful: { en: 'Breast red and painful', kn: 'ಸ್ತನ ಕೆಂಪು ಮತ್ತು ನೋವು' },
  calf_pain_swelling: { en: 'Calf pain or swelling', kn: 'ಕಾಲಿನ ಮೀನಖಂಡ ನೋವು ಅಥವಾ ಊತ' },
  breathless: { en: 'Short of breath', kn: 'ಉಸಿರಾಟದ ತೊಂದರೆ' },
  chest_pain: { en: 'Chest pain', kn: 'ಎದೆನೋವು' },
  fits: { en: 'Fits', kn: 'ಸೆಳವು' },
  unconscious: { en: 'Unconscious', kn: 'ಪ್ರಜ್ಞೆ ಇಲ್ಲ' },
  dizziness_fainting: { en: 'Dizziness or fainting', kn: 'ತಲೆಸುತ್ತು ಅಥವಾ ಮೂರ್ಛೆ' },
  stopped_bp_medicine: { en: 'Stopped BP medicine', kn: 'ಬಿಪಿ ಔಷಧ ನಿಲ್ಲಿಸಿದ್ದಾರೆ' },
  stopped_iron: { en: 'Stopped iron tablets', kn: 'ಕಬ್ಬಿಣದ ಮಾತ್ರೆ ನಿಲ್ಲಿಸಿದ್ದಾರೆ' },
  // Baby
  not_feeding: { en: 'Baby not feeding', kn: 'ಮಗು ಹಾಲು ಕುಡಿಯುತ್ತಿಲ್ಲ' },
  feeding_poor: { en: 'Baby feeding less than usual', kn: 'ಮಗು ಕಡಿಮೆ ಹಾಲು ಕುಡಿಯುತ್ತಿದೆ' },
  breathing_fast: { en: 'Baby breathing fast', kn: 'ಮಗು ವೇಗವಾಗಿ ಉಸಿರಾಡುತ್ತಿದೆ' },
  breaths_per_minute: { en: 'Breaths per minute', kn: 'ನಿಮಿಷಕ್ಕೆ ಉಸಿರು' },
  chest_indrawing: { en: 'Chest pulling in when breathing', kn: 'ಉಸಿರಾಡುವಾಗ ಎದೆ ಒಳಗೆಳೆಯುತ್ತಿದೆ' },
  feels_hot: { en: 'Baby feels hot', kn: 'ಮಗು ಬಿಸಿಯಾಗಿದೆ' },
  feels_cold: { en: 'Baby feels cold', kn: 'ಮಗು ತಣ್ಣಗಾಗಿದೆ' },
  lethargic: { en: 'Baby very sleepy or floppy', kn: 'ಮಗು ತುಂಬಾ ಮಂಕಾಗಿದೆ' },
  jaundice_palms_soles: { en: 'Yellow palms or soles', kn: 'ಅಂಗೈ ಅಥವಾ ಅಂಗಾಲು ಹಳದಿ' },
  jaundice_face_body: { en: 'Yellow face or body', kn: 'ಮುಖ ಅಥವಾ ದೇಹ ಹಳದಿ' },
  cord_red_or_pus: { en: 'Cord red or with pus', kn: 'ಹೊಕ್ಕುಳ ಕೆಂಪು ಅಥವಾ ಕೀವು' },
  vomiting_everything: { en: 'Baby vomiting everything', kn: 'ಮಗು ಎಲ್ಲವನ್ನೂ ವಾಂತಿ ಮಾಡುತ್ತಿದೆ' },
  wet_nappies_count: { en: 'Wet nappies today', kn: 'ಇಂದು ಒದ್ದೆಯಾದ ಬಟ್ಟೆಗಳು' },
  weight_grams: { en: 'Baby weight', kn: 'ಮಗುವಿನ ತೂಕ' },
};

const BABY_FITS: Bilingual = { en: 'Baby having fits', kn: 'ಮಗುವಿಗೆ ಸೆಳವು' };

export function factLabel(code: string | null, subject?: Subject, lang: Lang = 'en'): string {
  if (!code) return lang === 'en' ? 'Note' : 'ಟಿಪ್ಪಣಿ';
  if (code === 'fits' && subject === 'baby') return BABY_FITS[lang];
  return FACT_LABELS[code]?.[lang] ?? humanise(code);
}

const TAKING: Record<string, string> = { stopped_bp_medicine: 'Taking BP medicine', stopped_iron: 'Taking iron tablets' };

/** True when the entry records that a sign is absent ("no fever"). */
export function isDenied(entry: { value: string | null; code: string | null }): boolean {
  return Boolean(entry.code && entry.value?.toLowerCase().startsWith('no '));
}

/** What the entry says, the right way round: "No severe headache", "Taking BP medicine", "Large blood clots". */
export function entryLabel(entry: { code: string | null; value: string | null; subject: Subject }): string {
  if (!entry.code) return entry.value ?? 'Note';
  if (isDenied(entry)) {
    const taking = TAKING[entry.code];
    if (taking) return taking;
    const label = factLabel(entry.code, entry.subject);
    return `No ${label.charAt(0).toLowerCase()}${label.slice(1)}`;
  }
  return factLabel(entry.code, entry.subject);
}

/** Plain-language labels for every rule ID in docs/clinical-rules.md. */
const RULE_LABELS: Record<string, string> = {
  'M-BLEED-01': 'Very heavy bleeding',
  'M-BLEED-02': 'Heavy bleeding',
  'M-HTN-01': 'Headache with vision change or swelling',
  'M-HTN-02': 'Very high blood pressure',
  'M-HTN-03': 'High blood pressure with symptoms',
  'M-HTN-04': 'High blood pressure',
  'M-HTN-05': 'Severe headache or blurred vision',
  'M-FITS-01': 'Fits or unconscious',
  'M-SEPSIS-01': 'Fever with infection signs',
  'M-FEVER-01': 'Fever',
  'M-WOUND-01': 'Stitches look infected',
  'M-WOUND-02': 'Infected stitches with fever',
  'M-BREAST-01': 'Breast red and painful',
  'M-CLOT-01': 'Breathless or chest pain',
  'M-CLOT-02': 'Calf pain or swelling',
  'M-MED-01': 'Stopped BP medicine',
  'M-MED-02': 'Iron tablets reminder',
  'B-FEED-01': 'Baby not feeding',
  'B-FITS-01': 'Baby having fits',
  'B-BREATH-01': 'Baby breathing fast',
  'B-BREATH-02': 'Chest pulling in',
  'B-TEMP-01': 'Baby too hot or too cold',
  'B-ACT-01': 'Baby very sleepy or floppy',
  'B-JAUN-01': 'Yellow palms or soles',
  'B-JAUN-02': 'Jaundice in first day',
  'B-JAUN-03': 'Jaundice',
  'B-CORD-01': 'Cord infection signs',
  'B-VOMIT-01': 'Baby vomiting everything',
  'B-FEED-02': 'Baby feeding poorly',
  'B-WET-01': 'Too few wet nappies',
  'D-INF-01': 'Infection risk for both',
  'D-FEED-01': 'Breast pain affecting feeding',
  'D-JAUN-01': 'Jaundice with poor feeding',
  'H-REPEAT-01': 'Same warning twice in a row',
  'H-MISSED-01': 'Two calls missed',
  'X-DISMISS-01': 'Family played it down',
  'K-SAFETY-01': 'Emergency word heard',
};

export function ruleLabel(ruleId: string): string {
  return RULE_LABELS[ruleId] ?? 'Clinical rule';
}

export const LEVEL_LABELS: Record<Level, string> = {
  green: 'Stable',
  amber: 'Needs check today',
  red: 'Urgent',
};

export const SOURCE_LABELS: Record<Source, string> = {
  mother_reported: 'Mother-reported',
  family_reported: 'Family-reported',
  asha_measured: 'ASHA-measured',
  doctor_verified: 'Doctor-verified',
  document_extracted: 'From discharge slip',
  system: 'System',
};

export const SUBJECT_LABELS: Record<Subject, string> = { mother: 'Mother', baby: 'Baby' };

export const KIND_LABELS: Record<EntryKind, string> = {
  symptom: 'Symptom',
  vital: 'Measurement',
  medicine: 'Medicine',
  note: 'Note',
  visit: 'Visit',
  call: 'Call',
  onboarding: 'Onboarding',
};

export const PURPOSE_LABELS: Record<CallPurpose, string> = {
  onboarding: 'Onboarding',
  checkin: 'Check-in',
  inbound: 'Inbound',
  asha: 'ASHA update',
  doctor: 'Doctor visit',
  family_alert: 'Family alert',
};

export const TICKET_STATE_LABELS: Record<TicketState, string> = {
  open: 'Open',
  notified: 'Notified',
  acknowledged: 'Acknowledged',
  reached: 'Reached',
  closed: 'Closed',
};

export const DELIVERY_LABELS: Record<DeliveryType, string> = {
  normal: 'Normal delivery',
  c_section: 'C-section',
  assisted: 'Assisted delivery',
};

export const OUTCOME_LABELS: Record<CallOutcome, string> = {
  completed: 'Completed',
  red_flag: 'Urgent flag',
  amber_flag: 'Check-today flag',
  no_answer: 'No answer',
  wrong_person: 'Wrong person',
};

const COMPLICATION_LABELS: Record<string, string> = {
  high_bp_in_pregnancy: 'High BP in pregnancy',
  gestational_diabetes: 'Diabetes in pregnancy',
  anaemia: 'Anaemia',
  preterm: 'Born early',
  low_birth_weight: 'Low birth weight',
  pph: 'Heavy bleeding after delivery',
};

export function complicationLabel(code: string): string {
  return COMPLICATION_LABELS[code] ?? humanise(code);
}

export const LANGUAGE_LABELS: Record<string, string> = { kn: 'Kannada', hi: 'Hindi', en: 'English' };

export function languageLabel(code: string): string {
  return LANGUAGE_LABELS[code] ?? code.toUpperCase();
}

export function relationLabel(relation: string): string {
  return humanise(relation);
}

/** Last-resort fallback so a raw snake_case code is never shown. */
function humanise(code: string): string {
  const words = code.replace(/[_-]+/g, ' ').trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
