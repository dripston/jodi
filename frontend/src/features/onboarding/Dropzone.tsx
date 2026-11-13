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
        'flex min-h-72 flex-col items-center justify-center rounded border border-dashed p-6 text-center transition-colors duration-120',
        over ? 'border-brand bg-brand-soft' : 'border-border-strong bg-surface-muted',
      )}
    >
      {preview ? (
        <img src={preview} alt="Discharge slip preview" className="max-h-60 rounded-sm border border-border object-contain" />
      ) : (
        <>
          <span className="flex size-12 items-center justify-center rounded-full border border-border bg-surface text-text-muted shadow-raised">
            <FileImage className="size-5" strokeWidth={1.75} aria-hidden />
          </span>
          <p className="mt-4 text-h3 text-text">Drop a photo of the discharge slip</p>
          <p className="mt-1 text-body text-text-muted">JPG or PNG, or take a photo on a phone.</p>
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
