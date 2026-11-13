import { ShieldCheck } from 'lucide-react';
import { BrowserFrame } from './PreviewFrame';
import { ConversationPreview } from './ConversationPreview';
import { ProfilePreview } from './ProfilePreview';

/** Live board: the call on one side, the record updating on the other. */
export function LivePreview() {
  return (
    <BrowserFrame
      address="jodi · Live board"
      label="Illustrative live board: a check-in call in Kannada becomes source-labelled record entries and an urgent status."
    >
      <div className="grid gap-4 p-4 sm:p-6 md:grid-cols-2">
        <div>
          <p className="mb-2 text-caption text-text-muted">On the call</p>
          <ConversationPreview />
        </div>
        <div>
          <p className="mb-2 text-caption text-text-muted">In the record</p>
          <ProfilePreview entries={2} />
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-border bg-surface px-4 py-2.5 text-small text-green-fg sm:px-6">
        <ShieldCheck className="size-4" strokeWidth={1.75} />
        Record verified · 42 entries
      </div>
    </BrowserFrame>
  );
}
