import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, Check, X, Loader2, Trash2, TestTube, ExternalLink, ShieldCheck, AlertCircle } from 'lucide-react';
import { apiClient } from '@/services/apiClient';

const PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI',
    models: 'GPT-4o, GPT-4 Turbo',
    placeholder: 'sk-...',
    color: '#10a37f',
    bg: 'rgba(16,163,127,0.08)',
    border: 'rgba(16,163,127,0.25)',
    docs: 'https://platform.openai.com/api-keys',
    logo: 'ðŸ¤–',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    models: 'Claude 3.5, Claude 3 Opus',
    placeholder: 'sk-ant-...',
    color: '#d97706',
    bg: 'rgba(217,119,6,0.08)',
    border: 'rgba(217,119,6,0.25)',
    docs: 'https://console.anthropic.com/settings/keys',
    logo: 'ðŸ§ ',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    models: 'Gemini 2.5 Pro, Flash',
    placeholder: 'AIza...',
    color: '#4285f4',
    bg: 'rgba(66,133,244,0.08)',
    border: 'rgba(66,133,244,0.25)',
    docs: 'https://aistudio.google.com/app/apikey',
    logo: 'âœ¨',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    models: 'DeepSeek Coder V3, R1',
    placeholder: 'sk-...',
    color: '#6366f1',
    bg: 'rgba(99,102,241,0.08)',
    border: 'rgba(99,102,241,0.25)',
    docs: 'https://platform.deepseek.com/api-keys',
    logo: 'ðŸ”®',
  },
  {
    id: 'grok',
    name: 'xAI Grok',
    models: 'Grok-3, Grok-3 Mini',
    placeholder: 'xai-...',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.25)',
    docs: 'https://console.x.ai',
    logo: 'âš¡',
  },
];

function ProviderCard({ provider, savedKey, onSave, onDelete, onTest }) {
  const [key, setKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [error, setError] = useState('');
  const [showInput, setShowInput] = useState(false);

  const isConfigured = !!savedKey;

  const handleSave = async () => {
    if (!key.trim()) return;
    setSaving(true);
    setError('');
    setTestResult(null);
    try {
      await onSave(provider.id, key.trim());
      setKey('');
      setShowInput(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    setError('');
    try {
      const result = await onTest(provider.id);
      setTestResult({ ok: true, detail: result.detail });
    } catch (e) {
      setTestResult({ ok: false, detail: e.message });
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = async () => {
    setError('');
    setTestResult(null);
    try {
      await onDelete(provider.id);
      setShowInput(false);
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5 transition-all"
      style={{
        background: isConfigured ? provider.bg : 'var(--card-bg)',
        border: `1px solid ${isConfigured ? provider.border : 'var(--card-border)'}`,
      }}
    >
      {/* Provider header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl grid place-items-center text-lg flex-shrink-0"
            style={{ background: provider.bg, border: `1px solid ${provider.border}` }}
          >
            {provider.logo}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm" style={{ color: 'var(--fg-color)' }}>
                {provider.name}
              </span>
              {isConfigured && (
                <span
                  className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{ background: provider.color + '20', color: provider.color }}
                >
                  <Check size={10} /> Active
                </span>
              )}
            </div>
            <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>{provider.models}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={provider.docs}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg hover:bg-white/5 transition"
            title="Get API Key"
          >
            <ExternalLink size={14} className="text-slate-400" />
          </a>
          {isConfigured && (
            <>
              <button
                onClick={handleTest}
                disabled={testing}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition"
                style={{ background: provider.bg, color: provider.color, border: `1px solid ${provider.border}` }}
                title="Test key"
              >
                {testing ? <Loader2 size={12} className="animate-spin" /> : <TestTube size={12} />}
                <span className="hidden sm:inline">{testing ? 'Testing...' : 'Test'}</span>
              </button>
              <button
                onClick={() => setShowInput(v => !v)}
                className="text-xs px-2.5 py-1.5 rounded-lg text-slate-400 hover:bg-white/5 border border-white/10 transition"
              >
                Update
              </button>
              <button
                onClick={handleDelete}
                className="p-1.5 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition"
                title="Remove key"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Configured key hint */}
      {isConfigured && !showInput && (
        <div className="mt-3 flex items-center gap-2">
          <ShieldCheck size={14} style={{ color: provider.color }} />
          <code className="text-xs px-2 py-1 rounded" style={{ background: 'var(--bg-color)', color: 'var(--fg-muted)' }}>
            {savedKey.key_hint}
          </code>
          <span className="text-xs text-slate-500">encrypted at rest</span>
        </div>
      )}

      {/* Test result */}
      <AnimatePresence>
        {testResult && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`mt-2 flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${testResult.ok ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'}`}
          >
            {testResult.ok ? <Check size={12} /> : <AlertCircle size={12} />}
            {testResult.ok ? 'âœ“ Valid:' : 'âœ— Failed:'} {testResult.detail}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Key input (for new or update) */}
      <AnimatePresence>
        {(!isConfigured || showInput) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 space-y-2"
          >
            <div className="flex gap-2">
              <input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder={provider.placeholder}
                className="flex-1 px-3 py-2.5 rounded-xl text-sm"
                style={{
                  background: 'var(--bg-color)',
                  color: 'var(--fg-color)',
                  border: '1px solid var(--card-border)',
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
              <button
                onClick={handleSave}
                disabled={saving || !key.trim()}
                className="px-4 py-2 text-sm rounded-xl font-semibold transition disabled:opacity-50"
                style={{
                  background: `linear-gradient(135deg, ${provider.color}dd, ${provider.color}99)`,
                  color: '#fff',
                }}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
              </button>
              {showInput && (
                <button onClick={() => { setShowInput(false); setKey(''); }} className="px-3 py-2 rounded-xl text-slate-400 hover:bg-white/5 border border-white/10 transition">
                  <X size={14} />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="mt-2 flex items-center gap-2 text-xs text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">
          <AlertCircle size={12} /> {error}
        </div>
      )}
    </motion.div>
  );
}

export default function ApiKeysPanel() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchKeys = async () => {
    try {
      const data = await apiClient.listApiKeys();
      setKeys(data.keys || []);
    } catch {
      setKeys([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchKeys(); }, []);

  const handleSave = async (provider, apiKey) => {
    await apiClient.saveApiKey(provider, apiKey);
    await fetchKeys();
  };

  const handleDelete = async (provider) => {
    await apiClient.deleteApiKey(provider);
    await fetchKeys();
  };

  const handleTest = async (provider) => {
    return await apiClient.testApiKey(provider);
  };

  const getSavedKey = (providerId) => keys.find(k => k.provider === providerId);

  const configuredCount = PROVIDERS.filter(p => getSavedKey(p.id)).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Banner */}
      <div
        className="rounded-2xl p-4 flex items-start gap-3"
        style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}
      >
        <Key size={18} className="text-indigo-400 flex-shrink-0 mt-0.5" />
        <div>
          <div className="text-sm font-semibold text-indigo-300">Bring Your Own API Keys</div>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Add your own API keys to call AI providers with your account and billing. We never log or expose your keys â€”
            they are encrypted with AES-256 before being stored. You use them; we just route the call.
          </p>
          {configuredCount > 0 && (
            <div className="mt-2 text-xs font-medium" style={{ color: '#a5b4fc' }}>
              {configuredCount}/{PROVIDERS.length} providers configured
            </div>
          )}
        </div>
      </div>

      {/* Provider cards */}
      <div className="space-y-3">
        {PROVIDERS.map((p) => (
          <ProviderCard
            key={p.id}
            provider={p}
            savedKey={getSavedKey(p.id)}
            onSave={handleSave}
            onDelete={handleDelete}
            onTest={handleTest}
          />
        ))}
      </div>
    </div>
  );
}

