import type { Level, Source } from '@/api/schemas';

/** Level of each rule ID, from docs/clinical-rules.md. Used only for chip colour. */
export function ruleLevel(ruleId: string): Level | undefined {
  const red = [
    'M-BLEED-01',
    'M-HTN-01',
    'M-HTN-02',
    'M-HTN-03',
    'M-FITS-01',
    'M-SEPSIS-01',
    'M-WOUND-02',
    'M-CLOT-01',
    'B-FEED-01',
    'B-FITS-01',
    'B-BREATH-01',
    'B-BREATH-02',
    'B-TEMP-01',
    'B-ACT-01',
    'B-JAUN-01',
    'B-JAUN-02',
    'B-VOMIT-01',
    'D-JAUN-01',
    'K-SAFETY-01',
  ];
  const amber = [
    'M-BLEED-02',
    'M-HTN-04',
    'M-HTN-05',
    'M-FEVER-01',
    'M-WOUND-01',
    'M-BREAST-01',
    'M-CLOT-02',
    'M-MED-01',
    'B-JAUN-03',
    'B-CORD-01',
    'B-FEED-02',
    'B-WET-01',
    'D-FEED-01',
    'H-MISSED-01',
  ];
  if (red.includes(ruleId)) return 'red';
  if (amber.includes(ruleId)) return 'amber';
  return undefined;
}

/** Measured and verified entries carry more weight than reported ones. */
export function isStrongSource(source: Source): boolean {
  return source === 'asha_measured' || source === 'doctor_verified';
}
