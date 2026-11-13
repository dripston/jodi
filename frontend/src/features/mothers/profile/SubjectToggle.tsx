import { cn } from '@/lib/cn';

export type SubjectFilter = 'both' | 'mother' | 'baby';

const OPTIONS: { value: SubjectFilter; label: string }[] = [
  { value: 'both', label: 'Both' },
  { value: 'mother', label: 'Mother' },
  { value: 'baby', label: 'Baby' },
];

export function SubjectToggle({ value, onChange }: { value: SubjectFilter; onChange: (v: SubjectFilter) => void }) {
  return (
    <div role="radiogroup" aria-label="Show entries for" className="inline-flex rounded border border-border-strong bg-surface-muted p-0.5">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'h-8 cursor-pointer rounded-sm px-3 text-small font-medium transition-colors duration-120',
            value === o.value ? 'bg-surface text-text shadow-raised' : 'text-text-muted hover:text-text',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
