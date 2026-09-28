import React from 'react';
import { Link } from 'react-router-dom';

const productLinks = [
  { to: '/optimize', label: 'Optimizer' },
  { to: '/analysis', label: 'Analysis' },
  { to: '/bug-detection', label: 'Bug detection' },
  { to: '/workspace', label: 'Workspace' },
];

const legalLinks = [
  { to: '/privacy', label: 'Privacy Policy' },
  { to: '/terms', label: 'Terms & Conditions' },
];

export default function Footer() {
  const openCookieSettings = () => {
    window.dispatchEvent(new CustomEvent('aco-open-cookie-settings'));
  };

  return (
    <footer className="relative z-10 mt-24" style={{ borderTop: '1px solid var(--card-border)' }}>
      <div className="max-w-[1400px] mx-auto px-6 py-12 grid gap-10 md:grid-cols-3">
        <div>
          <p className="font-bold text-sm tracking-tight" style={{ color: 'var(--fg-color)' }}>
            AI Code Optimizer
          </p>
          <p className="text-sm text-muted mt-2 max-w-xs leading-relaxed">
            Analyze, optimize, and verify code with AI — with sandboxed execution proof.
          </p>
        </div>
        <nav aria-label="Product">
          <p className="text-xs font-bold uppercase tracking-widest text-muted mb-3">Product</p>
          <ul className="space-y-2">
            {productLinks.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="text-sm text-muted hover:opacity-100 hover:underline underline-offset-4">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Legal">
          <p className="text-xs font-bold uppercase tracking-widest text-muted mb-3">Legal</p>
          <ul className="space-y-2">
            {legalLinks.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="text-sm text-muted hover:opacity-100 hover:underline underline-offset-4">
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={openCookieSettings}
                className="text-sm text-muted hover:opacity-100 hover:underline underline-offset-4"
              >
                Cookie settings
              </button>
            </li>
          </ul>
        </nav>
      </div>
      <div className="py-5 text-center text-xs text-muted" style={{ borderTop: '1px solid var(--card-border)' }}>
        © {new Date().getFullYear()} AI Code Optimizer. All rights reserved.
      </div>
    </footer>
  );
}
