import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <main className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6">
      <p className="text-7xl font-black tracking-tighter" style={{ color: 'var(--accent-cyan)' }}>
        404
      </p>
      <h1 className="mt-4 text-2xl font-bold" style={{ color: 'var(--fg-color)' }}>
        This route fell off the graph
      </h1>
      <p className="mt-2 text-muted max-w-md">
        The page you requested doesn&apos;t exist or was moved. Here are safe places to land:
      </p>
      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <Link
          to="/"
          className="px-8 py-3 rounded-2xl font-bold text-white bg-gradient-to-r from-teal-500 to-emerald-500"
        >
          Back home
        </Link>
        <Link
          to="/optimize"
          className="px-8 py-3 rounded-2xl font-bold"
          style={{ border: '1px solid var(--card-border)', color: 'var(--fg-color)' }}
        >
          Open optimizer
        </Link>
      </div>
    </main>
  );
}
