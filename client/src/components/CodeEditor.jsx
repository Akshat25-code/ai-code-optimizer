import React from 'react';
import Editor from '@monaco-editor/react';
import { useTheme } from '../contexts/ThemeContext';

const languageMap = {
  // Canonical (backend) names
  'Python': 'python',
  'JavaScript': 'javascript',
  'TypeScript': 'typescript',
  'Java': 'java',
  'C++': 'cpp',
  'C#': 'csharp',
  'Go': 'go',
  'Rust': 'rust',
  'PHP': 'php',
  'Ruby': 'ruby',
  'SQL': 'sql',
  'HTML': 'html',
  'CSS': 'css',
  // Backward-compatible/aliases
  python: 'python',
  javascript: 'javascript',
  typescript: 'typescript',
  java: 'java',
  cpp: 'cpp',
  csharp: 'csharp',
  go: 'go',
  rust: 'rust',
};

export default function CodeEditor({ value, onChange, language = 'python', height = 320, readOnly = false }) {
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
    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--card-border)', height: '100%' }}>
      <Editor
        height={height}
        theme={monacoTheme}
        language={lang}
        value={value}
        onChange={(v) => onChange ? onChange(v || '') : null}
        options={{
          readOnly: readOnly,
          fontSize: 14,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          automaticLayout: true,
          // Spacing for line numbers instead of having them squished into the code
          lineNumbersMinChars: 3,
          glyphMargin: false,
          folding: true,
          lineDecorationsWidth: 15,
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
