import React from 'react';
import { HONEYPOT_FIELD } from '@/lib/spamGuard';

/**
 * Invisible-to-humans honeypot input. Bots that fill every field reveal
 * themselves; screen readers and keyboard users never encounter it.
 */
export default function HoneypotField({ value, onChange }) {
  return (
    <div aria-hidden="true" tabIndex={-1} style={{ position: 'absolute', left: '-9999px', top: 'auto', width: 1, height: 1, overflow: 'hidden' }}>
      <label>
        Leave this field empty
        <input
          type="text"
          name={HONEYPOT_FIELD}
          value={value}
          onChange={onChange}
          autoComplete="off"
          tabIndex={-1}
        />
      </label>
    </div>
  );
}
