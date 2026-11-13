/** Synthetic transcripts from docs/demo-script.md, used by the Inject transcript fallback. */
export interface InjectPreset {
  id: string;
  label: string;
  caller: 'mother' | 'family' | 'asha';
  transcript: string;
}

export const PRESETS: InjectPreset[] = [
  {
    id: 'red',
    label: 'Check-in that turns red',
    caller: 'mother',
    transcript:
      'naalku batte since morning… ondu ganteyalli batte poorti. tale bhaara. magu haalu kammi kudiyuttide.',
  },
  { id: 'dismiss', label: 'Husband dismisses', caller: 'family', transcript: 'Delivery aadmele heege, normal.' },
  {
    id: 'asha',
    label: 'ASHA visit',
    caller: 'asha',
    transcript: 'Lakshmi nodide, BP 150 over 100, magu 2.8 kg. Going to district hospital.',
  },
  { id: 'doctor', label: 'Doctor adds medicine', caller: 'mother', transcript: 'Doctor here. Started iron and labetalol 200.' },
];
