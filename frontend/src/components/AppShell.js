import React from 'react';
import { Link } from 'react-router-dom';
import Logo from './Logo';

const containerClasses = {
  full: 'app-shell__main app-shell__main--full',
  xl: 'app-shell__main app-shell__main--xl',
  lg: 'app-shell__main app-shell__main--lg',
  md: 'app-shell__main app-shell__main--md',
  sm: 'app-shell__main app-shell__main--sm',
};

function clsx(...parts) {
  return parts
    .flat()
    .filter(Boolean)
    .join(' ');
}

export default function AppShell({
  background = 'gradient',
  navLeft,
  navRight,
  navClassName = '',
  children,
  hero,
  container = 'lg',
  mainClassName = '',
  footer,
}) {
  const shellClass = clsx('app-shell', `app-shell--${background}`);
  const navClasses = clsx('app-shell__nav', navClassName);
  const mainClasses = clsx(containerClasses[container] || containerClasses.lg, mainClassName);

  return (
    <div className={shellClass}>
      <header className={navClasses}>
        <div className="app-shell__brand">
          {navLeft || (
            <Link to="/" className="app-shell__brand-link" aria-label="Home">
              <Logo as="span" className="mb-0" />
            </Link>
          )}
        </div>
        <div className="app-shell__actions">{navRight}</div>
      </header>

      {hero && <section className="app-shell__hero">{hero}</section>}

      <main className={mainClasses}>{children}</main>

      {footer && <footer className="app-shell__footer">{footer}</footer>}
    </div>
  );
}
