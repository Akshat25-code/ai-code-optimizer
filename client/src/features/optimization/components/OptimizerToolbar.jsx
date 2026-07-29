import React from 'react';

const TABS = [
  { id: 'code', label: 'Editor & Results' },
  { id: 'complexity', label: 'Complexity Engine' },
  { id: 'inspection', label: 'Security & Bugs' },
  { id: 'trace', label: 'Algorithm Trace' },
  { id: 'rules', label: 'Rules Engine' },
  { id: 'tests', label: 'Unit Tests' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'team', label: 'Collaboration' },
];

export default function OptimizerToolbar({
  activeTab,
  setActiveTab,
  language,
  setLanguage,
  supportedLanguages,
  task,
  setTask,
  aiProvider,
  setAiProvider,
  streamingEnabled,
  setStreamingEnabled,
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-2 rounded-2xl border border-white/10">
      <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar max-w-full">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30 font-semibold'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={streamingEnabled}
            onChange={(e) => setStreamingEnabled(e.target.checked)}
            className="rounded border-gray-700 text-teal-500 focus:ring-teal-500 bg-slate-800"
          />
          Stream AI
        </label>

        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="bg-slate-950 text-xs text-gray-200 border border-white/10 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-teal-500"
        >
          {supportedLanguages.map((lang) => (
            <option key={lang.id} value={lang.id}>
              {lang.name}
            </option>
          ))}
        </select>

        <select
          value={aiProvider}
          onChange={(e) => setAiProvider(e.target.value)}
          className="bg-slate-950 text-xs text-gray-200 border border-white/10 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-teal-500"
        >
          <option value="auto">Auto Select</option>
          <option value="openai">OpenAI GPT-4o</option>
          <option value="anthropic">Anthropic Claude</option>
          <option value="gemini">Google Gemini</option>
          <option value="deepseek">DeepSeek R1</option>
        </select>
      </div>
    </div>
  );
}

