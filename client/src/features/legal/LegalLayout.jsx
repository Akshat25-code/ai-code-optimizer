import React from 'react';

export default function LegalLayout({ title, updated, children }) {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-4xl font-black tracking-tight mb-2" style={{ color: 'var(--fg-color)' }}>
        {title}
      </h1>
      <p className="text-sm text-muted mb-10">Last updated: {updated}</p>
      <div className="space-y-6 text-[15px] leading-relaxed" style={{ color: 'var(--fg-color)' }}>
        {children}
      </div>
    </main>
  );
}

export function H2({ children }) {
  return (
    <h2 className="text-xl font-bold pt-4" style={{ color: 'var(--fg-color)' }}>
      {children}
    </h2>
  );
}

export function P({ children }) {
  return <p className="text-muted">{children}</p>;
}

export function UL({ items }) {
  return (
    <ul className="list-disc pl-6 space-y-1 text-muted">
      {items.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  );
}
