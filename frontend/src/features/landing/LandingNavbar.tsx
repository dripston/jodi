import { Menu, X } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { APP_PATH, NAV_LINKS } from './content';
import { Logo } from '@/components/layout/Logo';
import { PillLink } from './PillLink';

/** Floating pill navigation. Below lg the section links fold into a disclosure menu. */
export function LandingNavbar() {
  const [open, setOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const close = () => setOpen(false);
  return (
    <header className="fixed inset-x-0 top-3 z-40 px-3 sm:top-4 sm:px-5 lg:px-6 xl:px-10">
      <nav
        aria-label="Main"
        className="mx-auto flex h-14 max-w-landing items-center gap-2 rounded-full border border-lp-line bg-white pl-4 pr-2 shadow-raised"
      >
        <a href="#top" aria-label="Jodi, back to top" className="rounded-full">
          <Logo />
        </a>
        <ul className="mx-auto hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="rounded-full px-3.5 py-2 text-body text-lp-muted transition-colors duration-120 hover:bg-lp-bg hover:text-lp-ink"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="ml-auto flex items-center gap-1 lg:ml-0">
          <Link
            to={APP_PATH}
            className="hidden rounded-full px-3.5 py-2 text-body text-lp-ink transition-colors duration-120 hover:bg-lp-bg sm:inline-flex"
          >
            Log in
          </Link>
          <PillLink to={APP_PATH} size="sm" className="h-10">
            Launch Jodi
          </PillLink>
          <button
            type="button"
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((o) => !o)}
            className="flex size-10 cursor-pointer items-center justify-center rounded-full text-lp-ink hover:bg-lp-bg lg:hidden"
          >
            {open ? (
              <X className="size-5" strokeWidth={1.75} />
            ) : (
              <Menu className="size-5" strokeWidth={1.75} />
            )}
          </button>
        </div>
      </nav>
      <div
        id={menuId}
        hidden={!open}
        className="mx-auto mt-2 max-w-landing rounded-lg border border-lp-line bg-white p-2 shadow-popover lg:hidden"
      >
        <ul>
          {NAV_LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                onClick={close}
                className="flex h-12 items-center rounded px-4 text-body-lg text-lp-ink hover:bg-lp-bg"
              >
                {l.label}
              </a>
            </li>
          ))}
          <li className="sm:hidden">
            <Link
              to={APP_PATH}
              onClick={close}
              className="flex h-12 items-center rounded px-4 text-body-lg text-lp-ink hover:bg-lp-bg"
            >
              Log in
            </Link>
          </li>
        </ul>
      </div>
    </header>
  );
}
