interface MetaFactsProps {
  items: { label: string; value: string }[];
}

/** Small label-over-value facts, used for the clinical identity of mother and baby. */
export function MetaFacts({ items }: MetaFactsProps) {
  return (
    <dl className="mt-4 grid grid-cols-3 gap-4">
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-caption font-normal text-text-subtle">{item.label}</dt>
          <dd className="tabular mt-0.5 truncate text-body-lg font-medium text-text">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
