import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import profileService from '../services/profileService';
import authService from '../services/authService';
import { API_BASE } from '../config';
import { useTheme } from '../contexts/ThemeContext';

const TabButton = ({ id, active, onClick, children }) => (
  <button
    onClick={() => onClick(id)}
    className={`px-3 py-2 rounded-md text-sm border transition-colors ${active ? 'border-theme' : 'border-theme'} `}
    style={{
      background: active ? 'rgba(99,102,241,0.12)' : 'var(--card-bg)',
      color: 'var(--fg-color)'
    }}
  >
    {children}
  </button>
);

const OverviewTab = ({ profile, onAvatarChange, onSaved }) => {
  const [name, setName] = useState(profile?.name || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    setName(profile?.name || '');
    setEmail(profile?.email || '');
  }, [profile]);

  const save = async () => {
    setSaving(true); setMsg('');
    const res = await profileService.updateMe({ name, email });
    setSaving(false);
    setMsg(res.ok ? 'Saved.' : (res.data?.detail || 'Failed to save'));
    if (res.ok && onSaved) onSaved();
  };

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const res = await profileService.uploadAvatar(f);
    if (res.ok) {
      onAvatarChange(res.data.profile_picture);
      if (onSaved) onSaved();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <img src={profile?.profile_picture || 'https://api.dicebear.com/7.x/identicon/svg?seed=user'} alt="avatar" className="w-16 h-16 rounded-full border border-theme" />
        <div>
          <label className="text-sm" style={{color:'var(--fg-color)'}}>Change avatar</label>
          <input type="file" accept="image/*" onChange={onFile} className="block text-sm text-muted" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-muted mb-1">Name</label>
          <input value={name} onChange={e=>setName(e.target.value)} className="w-full rounded-md px-3 py-2 border border-theme" style={{background:'var(--card-bg)', color:'var(--fg-color)'}} />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">Email</label>
          <input value={email} onChange={e=>setEmail(e.target.value)} className="w-full rounded-md px-3 py-2 border border-theme" style={{background:'var(--card-bg)', color:'var(--fg-color)'}} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="px-4 py-2 rounded-md bg-gradient-to-r from-teal-600 to-emerald-500 text-white text-sm disabled:opacity-60">{saving? 'Saving…' : 'Save changes'}</button>
        <span className="text-sm text-muted">{msg}</span>
      </div>
    </div>
  );
};

const PreferencesTab = ({ profile, onUpdated }) => {
  const { setTheme: applyThemeCtx } = useTheme();
  const [theme, setTheme] = useState(profile?.preferences?.theme || 'system');
  const [language, setLanguage] = useState(profile?.preferences?.language || 'auto');
  const [saving, setSaving] = useState(false);

  useEffect(()=>{
    setTheme(profile?.preferences?.theme || 'system');
    setLanguage(profile?.preferences?.language || 'auto');
  }, [profile]);

  const save = async () => {
    setSaving(true);
    const res = await profileService.updatePreferences({ theme, language });
    setSaving(false);
    if (res.ok) onUpdated(res.data.preferences);
    // Apply selected theme immediately
    applyThemeCtx(theme);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-muted mb-1">Theme</label>
        <select value={theme} onChange={e=>setTheme(e.target.value)} className="rounded-md px-3 py-2 border border-theme" style={{background:'var(--card-bg)', color:'var(--fg-color)'}}>
          <option value="system">System</option>
          <option value="dark">Dark</option>
          <option value="light">Light</option>
        </select>
      </div>
      <div>
        <label className="block text-xs text-muted mb-1">Default Language</label>
        <input value={language} onChange={e=>setLanguage(e.target.value)} className="w-full rounded-md px-3 py-2 border border-theme" style={{background:'var(--card-bg)', color:'var(--fg-color)'}} />
      </div>
      <button onClick={save} disabled={saving} className="px-4 py-2 rounded-md text-sm border border-theme disabled:opacity-60" style={{background:'var(--card-bg)', color:'var(--fg-color)'}}>{saving? 'Saving…' : 'Save Preferences'}</button>
    </div>
  );
};

const SecurityTab = () => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const change = async () => {
    setSaving(true); setMsg('');
    const res = await profileService.changePassword(current, next);
    setSaving(false);
    setMsg(res.ok ? 'Password updated.' : (res.data?.detail || 'Failed'));
    if (res.ok) { setCurrent(''); setNext(''); }
  };
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-muted mb-1">Current password</label>
        <input type="password" value={current} onChange={e=>setCurrent(e.target.value)} className="w-full rounded-md px-3 py-2 border border-theme" style={{background:'var(--card-bg)', color:'var(--fg-color)'}} />
      </div>
      <div>
        <label className="block text-xs text-muted mb-1">New password</label>
        <input type="password" value={next} onChange={e=>setNext(e.target.value)} className="w-full rounded-md px-3 py-2 border border-theme" style={{background:'var(--card-bg)', color:'var(--fg-color)'}} />
      </div>
      <div className="flex items-center gap-3">
        <button onClick={change} disabled={saving} className="px-4 py-2 rounded-md text-sm border border-theme" style={{background:'var(--card-bg)', color:'var(--fg-color)'}}>{saving? 'Updating…' : 'Change Password'}</button>
        <span className="text-sm text-muted">{msg}</span>
      </div>
    </div>
  );
};

const AccountsTab = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const refresh = async () => {
    setLoading(true);
    const res = await profileService.listConnected();
    setLoading(false);
    if (res.ok) setAccounts(res.data.accounts || []);
  };
  useEffect(() => { refresh(); }, []);
  const unlink = async (p) => {
    const res = await profileService.unlinkProvider(p);
    if (res.ok) refresh();
  };
  return (
    <div>
      {loading ? <div className="text-sm text-muted">Loading…</div> : (
        <ul className="space-y-2">
          {accounts.length === 0 && <li className="text-sm text-muted">No connected accounts.</li>}
          {accounts.map(a => (
            <li key={a.provider} className="flex items-center justify-between rounded-md px-3 py-2 border border-theme" style={{background:'var(--card-bg)'}}>
              <div className="text-sm" style={{color:'var(--fg-color)'}}>{a.provider}</div>
              <button onClick={() => unlink(a.provider)} className="text-xs px-2 py-1 rounded border border-theme" style={{background:'var(--card-bg)', color:'var(--fg-color)'}}>Unlink</button>
            </li>
          ))}
          <li className="pt-3 border-t border-theme">
            <div className="text-xs text-muted mb-2">Link a provider</div>
            <div className="flex flex-wrap gap-2">
              {['google','github','linkedin','facebook'].map(p => (
                <button
                  key={p}
                  onClick={async () => {
                    // Use existing OAuth popup; this will sign you in and link the account (if same email)
                    const res = await authService.loginWithProvider(p);
                    if (res.success) refresh();
                  }}
                  className="text-xs px-3 py-1.5 rounded border border-theme hover:opacity-90"
                  style={{background:'var(--card-bg)', color:'var(--fg-color)'}}
                >
                  Link {p.charAt(0).toUpperCase()+p.slice(1)}
                </button>
              ))}
            </div>
          </li>
        </ul>
      )}
    </div>
  );
};

const DataTab = () => {
  const [isExporting, setIsExporting] = useState(false);

  const downloadJSON = async () => {
    const res = await profileService.exportProfile();
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'profile_export.json'; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = async () => {
    setIsExporting(true);
    try {
      const res = await profileService.exportProfilePDF();
      console.log('PDF export response status:', res.status);
      
      if (res.ok && res.status === 200) {
        // Force treating as binary blob, no JSON parsing
        const blob = await res.blob();
        console.log('Blob size:', blob.size, 'Type:', blob.type);
        
        // Create download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; 
        a.download = `ai_code_optimizer_export_${new Date().toISOString().split('T')[0]}.pdf`; 
        a.click();
        URL.revokeObjectURL(url);
        
        console.log('PDF download initiated successfully');
      } else {
        console.error('PDF export failed with status:', res.status);
        alert(`Failed to export PDF. Status: ${res.status}`);
      }
    } catch (error) {
      console.error('PDF export error:', error);
      alert(`Failed to export PDF: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const del = async () => {
    if (!confirm('Delete your account? This is irreversible.')) return;
    const res = await profileService.deleteAccount();
    if (res.ok) {
      // Clear tokens and reload
      localStorage.clear();
      window.location.href = '/';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-4" style={{color:'var(--fg-color)'}}>Export Your Data</h3>
        <div className="space-y-3">
          <div>
            <button 
              onClick={downloadJSON} 
              className="px-4 py-2 rounded-md text-sm border border-theme hover:opacity-90 w-full sm:w-auto"
              style={{background:'var(--card-bg)', color:'var(--fg-color)'}}
            >
              📄 Download JSON Export
            </button>
            <div className="text-xs text-muted mt-1">Raw data in JSON format (for developers)</div>
          </div>
          
          <div>
            <button 
              onClick={downloadPDF}
              disabled={isExporting}
              className="px-4 py-2 rounded-md text-sm border border-theme hover:opacity-90 w-full sm:w-auto disabled:opacity-50"
              style={{background:'var(--card-bg)', color:'var(--fg-color)'}}
            >
              {isExporting ? '⏳ Generating PDF...' : '📋 Download PDF Report'}
            </button>
            <div className="text-xs text-muted mt-1">
              Comprehensive report with profile, sessions, analytics, and security info
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t" style={{borderColor:'var(--card-border)'}}>
        <h3 className="font-semibold mb-3 text-red-600">Danger Zone</h3>
        <button 
          onClick={del} 
          className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm"
        >
          🗑️ Delete My Account
        </button>
        <div className="text-xs text-muted mt-1">This action cannot be undone.</div>
      </div>
    </div>
  );
};

const SessionsTab = ({ onSessionsLoaded }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/opt-sessions`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (resp.ok) {
        const data = await resp.json();
        setItems(data);
        if (onSessionsLoaded) onSessionsLoaded(data.length);
      }
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const exportAll = async () => {
    const res = await fetch(`${API_BASE}/opt-sessions/export`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'sessions_export.json'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold" style={{color:'var(--fg-color)'}}>Saved Sessions</h3>
        <button onClick={exportAll} className="text-xs px-3 py-1.5 rounded border border-theme" style={{background:'var(--card-bg)', color:'var(--fg-color)'}}>Export my sessions</button>
      </div>
      <div className="divide-y max-h-96 overflow-auto" style={{borderColor:'var(--card-border)'}}>
        {loading ? (
          <div className="text-sm text-muted py-6 text-center">Loading…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted py-6 text-center">No sessions yet</div>
        ) : items.map((s) => (
          <div key={s.id} className="py-3 flex items-center justify-between gap-3">
            <div className="text-left">
              <div className="text-sm line-clamp-1" style={{color:'var(--fg-color)'}}>{s.title || `${s.task} • ${s.language}`}</div>
              <div className="text-xs text-muted">{new Date(s.created_at).toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Enhanced Profile Components

const ProfileInfoTab = ({ profile, onUpdated }) => {
  const [bio, setBio] = useState(profile?.bio || '');
  const [city, setCity] = useState(profile?.location?.city || '');
  const [country, setCountry] = useState(profile?.location?.country || '');
  const [jobTitle, setJobTitle] = useState(profile?.professional?.job_title || '');
  const [company, setCompany] = useState(profile?.professional?.company || '');
  const [experienceLevel, setExperienceLevel] = useState(profile?.professional?.experience_level || 'Intermediate');
  const [github, setGithub] = useState(profile?.social_links?.github || '');
  const [linkedin, setLinkedin] = useState(profile?.social_links?.linkedin || '');
  const [twitter, setTwitter] = useState(profile?.social_links?.twitter || '');
  const [website, setWebsite] = useState(profile?.social_links?.website || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    setBio(profile?.bio || '');
    setCity(profile?.location?.city || '');
    setCountry(profile?.location?.country || '');
    setJobTitle(profile?.professional?.job_title || '');
    setCompany(profile?.professional?.company || '');
    setExperienceLevel(profile?.professional?.experience_level || 'Intermediate');
    setGithub(profile?.social_links?.github || '');
    setLinkedin(profile?.social_links?.linkedin || '');
    setTwitter(profile?.social_links?.twitter || '');
    setWebsite(profile?.social_links?.website || '');
  }, [profile]);

  const saveSection = async (section, data) => {
    setSaving(true);
    setMsg('');
    const res = await profileService.updateProfileSection(section, data);
    setSaving(false);
    setMsg(res.ok ? 'Saved.' : (res.data?.detail || 'Failed to save'));
    if (res.ok && onUpdated) onUpdated();
  };

  return (
    <div className="space-y-8">
      {/* Bio Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold" style={{color:'var(--fg-color)'}}>About</h3>
        <div>
          <label className="block text-xs text-muted mb-1">Bio</label>
          <textarea 
            value={bio} 
            onChange={e=>setBio(e.target.value)} 
            placeholder="Tell us about yourself..."
            className="w-full rounded-md px-3 py-2 border border-theme h-24 resize-none"
            style={{background:'var(--card-bg)', color:'var(--fg-color)'}}
            maxLength={500}
          />
          <div className="text-xs text-muted mt-1">{bio.length}/500 characters</div>
        </div>
        <button 
          onClick={() => saveSection('profile', {bio})} 
          disabled={saving}
          className="px-4 py-2 rounded-md bg-gradient-to-r from-teal-600 to-emerald-500 text-white text-sm disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Bio'}
        </button>
      </div>

      {/* Location Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold" style={{color:'var(--fg-color)'}}>Location</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-muted mb-1">City</label>
            <input value={city} onChange={e=>setCity(e.target.value)} className="w-full rounded-md px-3 py-2 border border-theme" style={{background:'var(--card-bg)', color:'var(--fg-color)'}} />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Country</label>
            <input value={country} onChange={e=>setCountry(e.target.value)} className="w-full rounded-md px-3 py-2 border border-theme" style={{background:'var(--card-bg)', color:'var(--fg-color)'}} />
          </div>
        </div>
        <button 
          onClick={() => saveSection('location', {city, country})} 
          disabled={saving}
          className="px-4 py-2 rounded-md bg-gradient-to-r from-teal-600 to-emerald-500 text-white text-sm disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Location'}
        </button>
      </div>

      {/* Professional Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold" style={{color:'var(--fg-color)'}}>Professional</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-muted mb-1">Job Title</label>
            <input value={jobTitle} onChange={e=>setJobTitle(e.target.value)} className="w-full rounded-md px-3 py-2 border border-theme" style={{background:'var(--card-bg)', color:'var(--fg-color)'}} />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Company</label>
            <input value={company} onChange={e=>setCompany(e.target.value)} className="w-full rounded-md px-3 py-2 border border-theme" style={{background:'var(--card-bg)', color:'var(--fg-color)'}} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs text-muted mb-1">Experience Level</label>
            <select value={experienceLevel} onChange={e=>setExperienceLevel(e.target.value)} className="w-full rounded-md px-3 py-2 border border-theme" style={{background:'var(--card-bg)', color:'var(--fg-color)'}}>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
              <option value="Expert">Expert</option>
            </select>
          </div>
        </div>
        <button 
          onClick={() => saveSection('professional', {job_title: jobTitle, company, experience_level: experienceLevel})} 
          disabled={saving}
          className="px-4 py-2 rounded-md bg-gradient-to-r from-teal-600 to-emerald-500 text-white text-sm disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Professional Info'}
        </button>
      </div>

      {/* Social Links Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold" style={{color:'var(--fg-color)'}}>Social Links</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-muted mb-1">GitHub</label>
            <input value={github} onChange={e=>setGithub(e.target.value)} placeholder="username or full URL" className="w-full rounded-md px-3 py-2 border border-theme" style={{background:'var(--card-bg)', color:'var(--fg-color)'}} />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">LinkedIn</label>
            <input value={linkedin} onChange={e=>setLinkedin(e.target.value)} placeholder="username or full URL" className="w-full rounded-md px-3 py-2 border border-theme" style={{background:'var(--card-bg)', color:'var(--fg-color)'}} />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Twitter</label>
            <input value={twitter} onChange={e=>setTwitter(e.target.value)} placeholder="username or full URL" className="w-full rounded-md px-3 py-2 border border-theme" style={{background:'var(--card-bg)', color:'var(--fg-color)'}} />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Website</label>
            <input value={website} onChange={e=>setWebsite(e.target.value)} placeholder="https://yourwebsite.com" className="w-full rounded-md px-3 py-2 border border-theme" style={{background:'var(--card-bg)', color:'var(--fg-color)'}} />
          </div>
        </div>
        <button 
          onClick={() => saveSection('social-links', {github, linkedin, twitter, website})} 
          disabled={saving}
          className="px-4 py-2 rounded-md bg-gradient-to-r from-teal-600 to-emerald-500 text-white text-sm disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Social Links'}
        </button>
      </div>

      {msg && <div className="text-sm text-muted">{msg}</div>}
    </div>
  );
};

const AnalyticsTab = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);
      const res = await profileService.getAnalytics();
      setLoading(false);
      if (res.ok) setAnalytics(res.data);
    };
    loadAnalytics();
  }, []);

  if (loading) return <div className="text-sm text-muted">Loading analytics...</div>;
  if (!analytics) return <div className="text-sm text-muted">No analytics data available</div>;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold" style={{color:'var(--fg-color)'}}>Usage Analytics</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-md p-4 border border-theme text-center" style={{background:'var(--card-bg)'}}>
          <div className="text-2xl font-bold text-teal-600">{analytics.total_sessions}</div>
          <div className="text-xs text-muted">Total Sessions</div>
        </div>
        <div className="rounded-md p-4 border border-theme text-center" style={{background:'var(--card-bg)'}}>
          <div className="text-2xl font-bold text-blue-600">{analytics.recent_sessions}</div>
          <div className="text-xs text-muted">Recent (30d)</div>
        </div>
        <div className="rounded-md p-4 border border-theme text-center" style={{background:'var(--card-bg)'}}>
          <div className="text-2xl font-bold text-green-600">{analytics.total_optimizations}</div>
          <div className="text-xs text-muted">Optimizations</div>
        </div>
        <div className="rounded-md p-4 border border-theme text-center" style={{background:'var(--card-bg)'}}>
          <div className="text-2xl font-bold text-orange-600">{analytics.account_age_days}</div>
          <div className="text-xs text-muted">Days Active</div>
        </div>
      </div>

      {analytics.languages_used && Object.keys(analytics.languages_used).length > 0 && (
        <div>
          <h4 className="font-semibold mb-3" style={{color:'var(--fg-color)'}}>Top Languages</h4>
          <div className="space-y-2">
            {Object.entries(analytics.languages_used).slice(0, 5).map(([lang, count]) => (
              <div key={lang} className="flex items-center justify-between">
                <span style={{color:'var(--fg-color)'}}>{lang}</span>
                <span className="text-muted">{count} sessions</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ProfilePage = () => {
  const { user, loading, refresh } = useAuth();
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState('overview');
  const [sessionCount, setSessionCount] = useState(0);

  const loadSessionCount = async () => {
    try {
      const sessionsRes = await fetch(`${API_BASE}/opt-sessions`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json();
        setSessionCount(sessionsData.length);
      }
    } catch (error) {
      console.error('Failed to load sessions count:', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      // Load profile data
      const res = await profileService.getMe();
      if (res.ok) setProfile(res.data);
      
      // Load sessions count
      await loadSessionCount();
    };
    init();
  }, []);

  const tabs = useMemo(() => ([
    { id: 'overview', label: 'Overview' },
    { id: 'profile', label: 'Profile Info' },
    { id: 'preferences', label: 'Preferences' },
    { id: 'security', label: 'Security' },
    { id: 'sessions', label: 'Sessions' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'accounts', label: 'Connected Accounts' },
    { id: 'phone', label: 'Phone' },
    { id: 'data', label: 'Data & Privacy' },
  ]), []);

  if (loading) return <div className="max-w-5xl mx-auto px-6 py-8 text-muted">Loading…</div>;
  if (!user) return <div className="max-w-5xl mx-auto px-6 py-8 text-muted">Please sign in to view your profile.</div>;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Summary header */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="md:col-span-2 rounded-lg p-5 border border-theme soft-shadow" style={{background:'var(--card-bg)'}}>
          <div className="flex items-center gap-4">
            <img src={user?.profile_picture || 'https://api.dicebear.com/7.x/identicon/svg?seed=user'} alt="avatar" className="w-14 h-14 rounded-full border border-theme" />
            <div>
              <div className="text-lg font-semibold" style={{color:'var(--fg-color)'}}>{user?.name || 'Your profile'}</div>
              <div className="text-sm text-muted">{user?.email}</div>
            </div>
          </div>
          <div className="mt-4 grid sm:grid-cols-3 gap-3 text-xs">
            <div className="rounded-md p-3 border border-theme" style={{background:'var(--card-bg)'}}>
              <div className="text-muted">Sessions</div>
              <div className="font-semibold" style={{color:'var(--fg-color)'}}>{sessionCount}</div>
            </div>
            <div className="rounded-md p-3 border border-theme" style={{background:'var(--card-bg)'}}>
              <div className="text-muted">Phone</div>
              <div className="font-semibold" style={{color:'var(--fg-color)'}}>{profile?.phone ? (profile?.phone_verified ? 'Verified' : 'Pending') : 'Not set'}</div>
            </div>
            <div className="rounded-md p-3 border border-theme" style={{background:'var(--card-bg)'}}>
              <div className="text-muted">Accounts</div>
              <div className="font-semibold" style={{color:'var(--fg-color)'}}>{(profile?.providers && profile?.providers.length) || 1} linked</div>
            </div>
          </div>
        </div>
        <div className="rounded-lg p-5 border border-theme soft-shadow" style={{background:'var(--card-bg)'}}>
          <div className="text-sm text-muted mb-4">Profile Completion</div>
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted">Progress</span>
              <span style={{color:'var(--fg-color)'}}>{profile?.profile_completion || 0}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-teal-600 to-emerald-500 h-2 rounded-full transition-all duration-300"
                style={{width: `${profile?.profile_completion || 0}%`}}
              ></div>
            </div>
          </div>
          <div className="text-sm text-muted mb-2">Account health</div>
          <ul className="text-xs space-y-2">
            <li className="flex items-center justify-between">
              <span className="text-muted">Email</span>
              <span style={{color:'var(--fg-color)'}}>{profile?.email ? 'Set' : 'Missing'}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted">MFA (phone)</span>
              <span style={{color:'var(--fg-color)'}}>{profile?.phone_verified ? 'On' : 'Off'}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted">Theme</span>
              <span style={{color:'var(--fg-color)'}}>{(user?.preferences && user.preferences.theme) || 'system'}</span>
            </li>
          </ul>
        </div>
      </div>

      <h1 className="text-xl font-semibold mb-4" style={{color:'var(--fg-color)'}}>Profile settings</h1>
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map(t => (
          <TabButton key={t.id} id={t.id} active={tab===t.id} onClick={setTab}>{t.label}</TabButton>
        ))}
      </div>

      <div className="rounded-lg p-5 border border-theme" style={{background:'var(--card-bg)'}}>
        {tab === 'overview' && <OverviewTab profile={profile} onAvatarChange={(url)=>setProfile(p=>({...p, profile_picture: url}))} onSaved={() => refresh()} />}
        {tab === 'profile' && <ProfileInfoTab profile={profile} onUpdated={() => { 
          const refreshProfile = async () => {
            const res = await profileService.getMe();
            if (res.ok) setProfile(res.data);
          };
          refreshProfile();
        }} />}
        {tab === 'preferences' && <PreferencesTab profile={profile} onUpdated={(prefs)=>setProfile(p=>({...p, preferences: prefs}))} />}
        {tab === 'security' && <SecurityTab />}
        {tab === 'sessions' && <SessionsTab onSessionsLoaded={(count) => setSessionCount(count)} />}
        {tab === 'analytics' && <AnalyticsTab />}
        {tab === 'accounts' && <AccountsTab />}
        {tab === 'phone' && <PhoneTab profile={profile} onUpdated={(p)=>setProfile(p)} />}
        {tab === 'data' && <DataTab />}
      </div>
    </div>
  );
};

export default ProfilePage;

// Phone Tab Component
const PhoneTab = ({ profile, onUpdated }) => {
  const [phone, setPhone] = useState(profile?.phone || '');
  const [otp, setOtp] = useState('');
  const [status, setStatus] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('auth_token');
  const apiBase = (window.API_BASE_URL) || (profileService?.API_BASE) || '';

  const setNumber = async () => {
    if (!phone) { setStatus('Enter phone'); return; }
    setLoading(true); setStatus('');
    try {
      const res = await fetch(`${API_BASE}/profile/phone/set`, { method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`}, body: JSON.stringify({ phone }) });
      const data = await res.json().catch(()=>({}));
      if (res.ok) { setStatus(data.message || 'Phone set'); onUpdated({...profile, phone, phone_verified:false}); }
      else setStatus(data.detail || 'Failed');
    } finally { setLoading(false); }
  };
  const resend = async () => {
    setLoading(true); setStatus('');
    try {
      const res = await fetch(`${API_BASE}/profile/phone/resend`, { method:'POST', headers:{'Authorization':`Bearer ${token}`}});
      const data = await res.json().catch(()=>({}));
      setStatus(res.ok ? (data.message || 'OTP sent') : (data.detail || 'Failed'));
    } finally { setLoading(false); }
  };
  const verify = async () => {
    if (!otp) { setStatus('Enter OTP'); return; }
    setLoading(true); setStatus('');
    try {
      const res = await fetch(`${API_BASE}/profile/phone/verify`, { method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`}, body: JSON.stringify({ phone, otp }) });
      const data = await res.json().catch(()=>({}));
      if (res.ok) { setStatus('Phone verified'); onUpdated({...profile, phone_verified:true}); }
      else setStatus(data.detail || 'Failed');
    } finally { setLoading(false); }
  };
  const fetchLatestOtpDev = async () => {
    if (!phone) { setStatus('Enter phone'); return; }
    try {
      const url = `${API_BASE}/auth/phone/debug-latest-otp?phone=${encodeURIComponent(phone)}`;
      const res = await fetch(url);
      const data = await res.json().catch(()=>({}));
      if (res.ok && data.otp) {
        setDevOtp(String(data.otp));
        setStatus('Fetched latest OTP (dev)');
      } else if (res.status === 403) {
        setStatus('DEV_OTP_DEBUG not enabled on server');
      } else {
        setStatus(data.detail || 'No OTP found');
      }
    } catch {
      setStatus('Failed to fetch OTP');
    }
  };
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-gray-400 mb-1">Phone (E.164 format)</label>
        <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+15551234567" className="w-full bg-gray-900 border border-gray-800 rounded-md px-3 py-2 text-gray-100" />
      </div>
      <div className="flex gap-2 flex-wrap">
        <button onClick={setNumber} disabled={loading} className="px-3 py-1.5 rounded bg-gray-800 text-gray-100 text-xs border border-gray-700 disabled:opacity-50">Set / Replace</button>
        <button onClick={resend} disabled={loading || !profile?.phone || profile?.phone_verified} className="px-3 py-1.5 rounded bg-gray-800 text-gray-100 text-xs border border-gray-700 disabled:opacity-50">Resend OTP</button>
        <button onClick={fetchLatestOtpDev} disabled={!phone} className="px-3 py-1.5 rounded bg-gray-800 text-gray-100 text-xs border border-gray-700 disabled:opacity-50">Fetch OTP (dev)</button>
      </div>
      {!profile?.phone_verified && profile?.phone && (
        <div className="space-y-2">
          <label className="block text-xs text-gray-400">Enter OTP</label>
          <div className="flex gap-2">
            <input value={otp} onChange={e=>setOtp(e.target.value.replace(/[^0-9]/g,''))} maxLength={6} placeholder="123456" className="flex-1 bg-gray-900 border border-gray-800 rounded-md px-3 py-2 text-gray-100" />
            <button onClick={verify} disabled={loading || otp.length!==6} className="px-3 py-1.5 rounded bg-gradient-to-r from-teal-600 to-emerald-500 text-white text-xs disabled:opacity-40">Verify</button>
          </div>
          {devOtp && (
            <div className="text-xs text-gray-300">Latest OTP (dev): <span className="font-mono">{devOtp}</span></div>
          )}
        </div>
      )}
      <div className="text-xs text-gray-400">Status: {profile?.phone_verified ? 'Verified ✅' : (profile?.phone ? 'Pending verification' : 'Not set')}</div>
      {status && <div className="text-xs text-gray-300">{status}</div>}
    </div>
  );
};
