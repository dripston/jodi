import { MapPin, Menu, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Kbd } from '@/components/ui/Kbd';

interface TopbarProps {
  title: string;
  onMenu: () => void;
}

export function Topbar({ title, onMenu }: TopbarProps) {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface px-4 md:px-8">
      <Button variant="ghost" size="icon-sm" className="md:hidden" aria-label="Open menu" onClick={onMenu}>
        <Menu strokeWidth={1.75} />
      </Button>
      <p className="text-h3 text-text">{title}</p>
      <div className="ml-auto flex items-center gap-2">
        <span className="hidden h-8 items-center gap-1.5 rounded border border-border px-3 text-small text-text-muted sm:inline-flex">
          <MapPin className="size-4" strokeWidth={1.75} aria-hidden />
          Demo District
        </span>
        <button
          type="button"
          onClick={() => navigate('/mothers')}
          className="hidden h-8 w-60 items-center gap-2 rounded border border-border bg-surface px-3 text-small text-text-subtle transition-colors duration-120 hover:border-border-strong lg:flex"
        >
          <Search className="size-4" strokeWidth={1.75} aria-hidden />
          Search mothers
          <span className="ml-auto flex gap-0.5">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>
      </div>
    </header>
  );
}
