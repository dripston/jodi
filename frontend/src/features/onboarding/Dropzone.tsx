import { Camera, FileImage, Upload } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

interface DropzoneProps {
  file: File | null;
  onFile: (file: File) => void;
  disabled?: boolean;
}

export function Dropzone({ file, onFile, disabled }: DropzoneProps) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const f = e.dataTransfer.files[0];
    if (f && !disabled) onFile(f);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={cn(
        'flex min-h-80 flex-col items-center justify-center rounded border border-dashed p-6 text-center transition-colors duration-120',
        over ? 'border-brand bg-brand-soft' : 'border-border-strong bg-surface',
      )}
    >
      {preview ? (
        <img src={preview} alt="Discharge slip preview" className="max-h-60 rounded-sm border border-border object-contain" />
      ) : (
        <>
          <FileImage className="size-6 text-text-subtle" strokeWidth={1.75} aria-hidden />
          <p className="mt-3 text-body font-medium text-text">Drop a photo of the discharge slip</p>
          <p className="mt-1 text-small text-text-muted">JPG or PNG. Use synthetic demo slips only.</p>
        </>
      )}
      <div className="mt-5 flex gap-2">
        <Button icon={file ? <Upload strokeWidth={1.75} /> : <Camera strokeWidth={1.75} />} onClick={() => input.current?.click()} disabled={disabled}>
          {file ? 'Choose another photo' : 'Choose or take photo'}
        </Button>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        aria-label="Discharge slip photo"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
    </div>
  );
}
