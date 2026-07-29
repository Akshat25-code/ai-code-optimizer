import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Key, Shield, Bell } from 'lucide-react';
import ApiKeysPanel from './ApiKeysPanel';

const TABS = [
  { id: 'api-keys', label: 'API Keys', icon: <Key size={16} />, description: 'Manage your AI provider keys' },
  { id: 'security', label: 'Security', icon: <Shield size={16} />, description: 'Account security settings' },
  { id: 'notifications', label: 'Notifications', icon: <Bell size={16} />, description: 'Notification preferences' },
];

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('api-keys');

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen py-10 px-4" style={{ background: 'var(--bg-color)' }}>
      <div className="max-w-3xl mx-auto">
        {/* Page header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--fg-color)' }}>Settings</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
            Configure your account and AI preferences
          </p>
        </motion.div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar tabs */}
          <motion.nav
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-shrink-0 w-full md:w-52 space-y-1"
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm transition-all"
                style={{
                  background: activeTab === tab.id ? 'var(--card-bg)' : 'transparent',
                  color: activeTab === tab.id ? 'var(--accent-cyan)' : 'var(--fg-muted)',
                  border: activeTab === tab.id ? '1px solid var(--card-border)' : '1px solid transparent',
                  fontWeight: activeTab === tab.id ? 600 : 400,
                }}
              >
                <span style={{ color: activeTab === tab.id ? 'var(--accent-cyan)' : 'var(--fg-muted)' }}>
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            ))}
          </motion.nav>

          {/* Main content */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 min-w-0"
          >
            {activeTab === 'api-keys' && <ApiKeysPanel />}

            {activeTab === 'security' && (
              <div
                className="rounded-2xl p-6 text-center"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
              >
                <Shield size={32} className="mx-auto mb-3 text-slate-500" />
                <div className="text-sm font-semibold mb-1" style={{ color: 'var(--fg-color)' }}>
                  Security Settings
                </div>
                <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                  Coming soon â€” password change, 2FA, and active sessions management.
                </p>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div
                className="rounded-2xl p-6 text-center"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
              >
                <Bell size={32} className="mx-auto mb-3 text-slate-500" />
                <div className="text-sm font-semibold mb-1" style={{ color: 'var(--fg-color)' }}>
                  Notification Preferences
                </div>
                <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                  Coming soon â€” email and in-app notification controls.
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

