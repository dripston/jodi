import { BadgeCheck, Cpu, FileText, MessageCircle, Stethoscope, Users } from 'lucide-react';
import type { Source } from '@/api/schemas';
import { Badge, type BadgeProps } from '@/components/ui/Badge';
import { SOURCE_LABELS } from '@/lib/labels';

const STYLE: Record<Source, { icon: typeof BadgeCheck; tone: BadgeProps['tone'] }> = {
  mother_reported: { icon: MessageCircle, tone: 'outline' },
  family_reported: { icon: Users, tone: 'outline' },
  asha_measured: { icon: Stethoscope, tone: 'info' },
  doctor_verified: { icon: BadgeCheck, tone: 'brand' },
  document_extracted: { icon: FileText, tone: 'neutral' },
  system: { icon: Cpu, tone: 'neutral' },
};

export function SourceBadge({ source }: { source: Source }) {
  const { icon: Icon, tone } = STYLE[source];
  return (
    <Badge tone={tone}>
      <Icon strokeWidth={1.75} aria-hidden />
      {SOURCE_LABELS[source]}
    </Badge>
  );
}
