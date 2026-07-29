import { useEffect } from 'react';

export default function useKeyboardShortcuts(shortcuts) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if the user is typing in a standard input/textarea
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
      // Let monaco handle its own shortcuts if we are focused inside it,
      // but we do want Cmd+K and Cmd+Enter to work globally.

      for (const shortcut of shortcuts) {
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : !(e.ctrlKey || e.metaKey);
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const altMatch = shortcut.alt ? e.altKey : !e.altKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          // If it's a global command like Cmd+K, we want to prevent default even in inputs
          if (shortcut.global || !isInput) {
            if (shortcut.preventDefault !== false) {
              e.preventDefault();
            }
            shortcut.action(e);
            return;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

