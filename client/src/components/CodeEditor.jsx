import React from 'react';
import Editor from '@monaco-editor/react';
import { useTheme } from '../contexts/ThemeContext';

const languageMap = {
  python: 'python',
  javascript: 'javascript',
  typescript: 'typescript',
  cpp: 'cpp',
  java: 'java',
  go: 'go',
  rust: 'rust',
};

export default function CodeEditor({ value, onChange, language = 'python', height = 320 }) {
  const lang = languageMap[language] || 'plaintext';
  const { theme } = useTheme();
  const resolvedTheme = React.useMemo(() => {
    if (theme === 'system') {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      return prefersDark ? 'dark' : 'light';
    }
    return theme;
  }, [theme]);
  const monacoTheme = resolvedTheme === 'dark' ? 'vs-dark' : 'light';
  return (
    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--card-border)' }}>
      <Editor
        height={height}
        theme={monacoTheme}
        language={lang}
        value={value}
        onChange={(v) => onChange(v || '')}
        options={{
          fontSize: 14,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          automaticLayout: true,
          // Slim gutter and reduce extra margins
          lineNumbersMinChars: 2,
          glyphMargin: false,
          folding: false,
          lineDecorationsWidth: 0,
          overviewRulerLanes: 0,
          overviewRulerBorder: false,
          padding: { top: 8, bottom: 8 },
          scrollbar: {
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
          },
        }}
      />
    </div>
  );
}
