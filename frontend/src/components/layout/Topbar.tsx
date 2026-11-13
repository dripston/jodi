import { Activity, ChevronRight, Menu, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Kbd } from '@/components/ui/Kbd';

interface TopbarProps {
  title: string;
  section: string | null;
  onMenu: () => void;
}

export function Topbar({ title, section, onMenu }: TopbarProps) {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-bg px-4 md:px-8">
      <Button variant="ghost" size="icon-sm" className="md:hidden" aria-label="Open menu" onClick={onMenu}>
        <Menu strokeWidth={1.75} />
      </Button>
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-small">
        <span className="hidden text-text-subtle sm:inline">Demo District</span>
        <ChevronRight className="hidden size-3.5 text-text-subtle sm:block" strokeWidth={1.75} aria-hidden />
        {section ? (
          <>
            <Link to="/mothers" className="text-text-subtle hover:text-text">{section}</Link>
            <ChevronRight className="size-3.5 text-text-subtle" strokeWidth={1.75} aria-hidden />
          </>
        ) : null}
        <span className="truncate font-medium text-text" aria-current="page">{title}</span>
      </nav>
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate('/mothers?focus=search')}
          aria-label="Search mothers"
          className="flex h-8 cursor-pointer items-center gap-2 rounded border border-border bg-surface px-2.5 text-small text-text-subtle shadow-raised transition-colors duration-120 hover:border-border-strong hover:text-text-muted lg:w-60"
        >
          <Search className="size-4" strokeWidth={1.75} aria-hidden />
          <span className="hidden lg:inline">Search mothers</span>
          <span className="ml-auto hidden gap-0.5 lg:flex">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>
        <Button asChild size="sm" variant="secondary" className="hidden sm:inline-flex">
          <Link to="/live">
            <Activity strokeWidth={1.75} />
            Live board
          </Link>
        </Button>
      </div>
    </header>
  );
}
