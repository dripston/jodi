import { Link } from 'react-router-dom';
import { APP_PATH, BRAND, FOOTER_LINKS } from './content';
import { Logo } from '@/components/layout/Logo';
import { FRAME, FRAME_OUTER } from './frame';
import { cn } from '@/lib/cn';

const LINK = 'text-body text-lp-muted transition-colors duration-120 hover:text-lp-ink';

export function LandingFooter() {
  return (
    <footer className={cn('border-t border-lp-line', FRAME_OUTER)}>
      <div className={cn(FRAME, 'py-14')}>
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 text-body-lg text-lp-muted">{BRAND.tagline}</p>
          </div>
          <nav aria-label="Footer">
            <ul className="grid grid-cols-2 gap-x-10 gap-y-3 sm:flex sm:flex-wrap sm:gap-x-8">
              {FOOTER_LINKS.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className={LINK}>
                    {l.label}
                  </a>
                </li>
              ))}
              <li>
                <Link to={APP_PATH} className={`${LINK} font-medium text-lp-ink`}>
                  Open Dashboard
                </Link>
              </li>
            </ul>
          </nav>
        </div>
        <div className="mt-12 flex flex-col gap-2 border-t border-lp-line pt-6 text-small text-lp-muted sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} Jodi. All rights reserved.</p>
          <p>Demonstration with synthetic data. Not for clinical use.</p>
        </div>
      </div>
    </footer>
  );
}
